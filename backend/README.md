# PigPlayer backend

The Express API uses Prisma 6 with SQLite for local development and optional PostgreSQL for deployment. Audio and artwork use local media storage. Use Node.js 22.12 or later.

## Development and verification

Run these commands from `backend/`.

```bash
npm ci
cp .env.example .env
npm run dev
```

The API listens on port 5000 by default. From the repository root, start the UI with `npm run dev:frontend`. To use the Next.js proxy, set `NEXT_PUBLIC_API_URL=/api` for the UI and set `BACKEND_INTERNAL_URL` to the backend's internal HTTP origin before building the UI. For direct browser calls, configure the backend with the UI's exact origin in `CLIENT_URL` or `CORS_ORIGINS`.

```bash
npm run build
npm run typecheck
npm test
npm audit
```

Jest provisions a fresh temporary SQLite database and media directory. The tests leave the application database and library alone. Use `npm run prisma:seed` to populate a development library with the bundled demo media after synchronizing its schema.

## Render Node service

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm start` |
| Health Check Path | `/api/ready` |

The backend npm configuration includes the TypeScript declarations, compiler, and Prisma CLI during source installs. For a Render service configured at the repository root, use `npm run build:backend` and `npm start`. Set the production environment variables below in the service settings.

For an existing Render library, set `DATA_ROOT` to the directory containing its media and `SQLITE_PATH` to the existing SQLite file. For example, if your persistent disk is mounted at `/var/data` and already contains `soundify.db`, use `DATA_ROOT=/var/data` and `SQLITE_PATH=/var/data/soundify.db`. Render preserves files under the persistent disk mount across deploys.

Set `DATABASE_PROVIDER=postgresql` to use a PostgreSQL service such as Neon. Set `DATABASE_URL` to the pooled PostgreSQL URL and `DIRECT_URL` to the unpooled URL for the same database and schema. If `DIRECT_URL` is unset, the app derives the direct hostname for Neon pooler URLs. Store both connection strings in the Render Environment settings. See the [Neon Prisma connection guide](https://neon.com/docs/guides/prisma).

When Render has a PostgreSQL `DATABASE_URL` and `DATABASE_PROVIDER` is unset, the backend selects PostgreSQL if there is no SQLite-specific configuration, configured data directory, or existing default SQLite file. Set the provider explicitly for an existing library cutover.

With `DATABASE_PROVIDER=sqlite`, an explicit SQLite setting takes precedence over a shared `DATABASE_URL`. When Render supplies a PostgreSQL URL and the SQLite service has a known data directory or default SQLite file, it logs the SQLite selection. Set `SQLITE_PATH` to an existing file when specifying the SQLite location directly.

## Production environment

| Variable | Purpose |
|---|---|
| `PORT` | API port, default 5000 |
| `CLIENT_URL`, `CORS_ORIGINS` | Primary browser origin and optional comma-separated HTTPS or HTTP origins |
| `TRUST_PROXY_HOPS` | Number of trusted proxy hops, default zero. Set it only when the API is reachable exclusively through that proxy topology. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Independent signing keys. Generate each with `openssl rand -hex 48` or your secret manager. Keep the keys stable across restarts. |
| `LOCAL_USER_EMAIL`, `LOCAL_USER_PASSWORD`, `LOCAL_USER_NAME` | Optional first-run administrator. Choose an unused email and a unique password of 16 to 72 bytes. Existing accounts retain their roles. |
| `DATA_ROOT` | Storage root for audio, artwork, backups, and the default SQLite database. Keep this directory on persistent storage. |
| `DATABASE_PROVIDER` | `sqlite` by default. Set `postgresql` to enable PostgreSQL. |
| `SQLITE_PATH`, `SQLITE_DATABASE_URL`, `DATABASE_URL` | SQLite overrides, in order of precedence. Relative `file:` URLs resolve from `backend/prisma`. |
| `DATABASE_URL`, `DIRECT_URL` | PostgreSQL runtime URL and optional direct migration URL when `DATABASE_PROVIDER=postgresql`. |
| `MAX_UPLOAD_MB` | Maximum audio file size, from 1 to 100 MB |
| `ALLOW_GUEST_MUTATIONS` | Opt-in shared guest state for local development only |

Production requires both signing keys. Deploying this update signs users out of sessions issued by older releases. Rotate any previously deployed example signing keys and default local or demo passwords. The API uses bearer tokens with a 15-minute access lifetime, single-use rotating refresh tokens, and a seven-day session limit. Logout revokes the current session and leaves other sessions active.

## Database upgrades

`npm run db:migrate` applies the tracked migrations for the selected database. SQLite migrations are in `prisma/migrations` and PostgreSQL migrations are in `prisma/postgresql/migrations`. `npm run prisma:push` is a compatibility alias. Builds generate both Prisma clients from the same data model.

`npm run build` generates the client and compiles TypeScript. Run `npm start` on the deployment host. The server applies migrations before opening its listener, including when launched directly with Node or nodemon. `/health` and `/api/health` are liveness checks. `/ready` and `/api/ready` check that the database schema is available.

### Import a SQLite library into PostgreSQL

Run this from a checkout with access to the existing SQLite database and the persistent media directory. Pause writes to the source for the import and keep its backup for rollback. The media files stay under `DATA_ROOT`, so transfer them to the deployed service's persistent storage before switching traffic.

1. Build the backend. Set `DATABASE_PROVIDER=postgresql`, the PostgreSQL connection strings, and `DATA_ROOT` in the migration environment.
2. Apply the PostgreSQL schema with `npm run db:migrate` before starting the app.
3. Run `npm run db:import-sqlite -- /path/to/soundify.db` to check row counts, media, and target emptiness. Run the same command with `--apply` to import accounts, catalog data, playlists, favorites, history, and sessions in a transaction.
4. Start the app with the PostgreSQL settings. Check `/api/ready`, sign in, and stream an existing track before routing traffic to the new deployment.

## API

Responses use `{ success, data }` where applicable, and errors use `{ success: false, message }`. Use `Authorization: Bearer <accessToken>` for authenticated requests. The same resource paths are also available without the `/api` prefix for older clients.

| Resource | Endpoints and access |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, and `/logout`. `GET /api/auth/me` returns the current account. Refresh accepts `{ refreshToken }`. Logout takes the access token in the authorization header. |
| Songs | `GET /api/songs` supports `q`, `genre`, `page`, and `limit` and returns a `pagination` object. `GET /api/songs/:id`, `/audio`, `/artwork`, and `/download` serve the shared catalog. Audio supports byte ranges. Writes require ownership or administrator access. `DELETE /api/songs/all` requires administrator access. |
| Search and statistics | `GET /api/search?q=…` and `GET /api/songs/stats` include only playlists and account activity the caller can access. |
| Playlists | `GET/POST /api/playlists`, `GET/PUT/DELETE /api/playlists/:id`, `POST /api/playlists/:id/songs`, `DELETE /api/playlists/:id/songs/:songId`, and `PUT /api/playlists/:id/reorder`. Reorder accepts a complete list of song IDs. |
| Favorites | `GET /api/favorites` and `POST/DELETE /api/favorites/:songId`. Favorites are scoped to the current account. |
| History | `GET/POST/DELETE /api/history`. History is scoped to the current account. |
| Upload | `POST /api/upload/analyze` and `/api/upload/song` accept multipart `audio`. Song uploads also accept a `cover` and the `skip`, `replace`, or `keep` duplicate policy. `POST /api/upload/artwork` accepts multipart `cover` or JSON `imageData`. |
| Backup | Administrator access is required for `GET/POST /api/backups`, `GET /api/backups/export`, and `POST /api/backups/import` and `/api/backups/restore`. Restore previews by default and requires the boolean `confirmReplace: true` to apply. |

Backup ZIPs live under `DATA_ROOT/backups`, with access restricted to the service account where supported. They contain library metadata and optionally media. SQLite ZIPs also include a database snapshot. Use your PostgreSQL host's database backup tools to capture account hashes and sessions. Keep backup files private. The API restores library records and media from the logical snapshot and keeps the live accounts and sessions.
