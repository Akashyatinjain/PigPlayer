# PigPlayer backend

The Express API uses Prisma 6, SQLite, and local media storage. Use Node.js 22.12 or later.

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

## Production environment

| Variable | Purpose |
|---|---|
| `PORT` | API port, default 5000 |
| `CLIENT_URL`, `CORS_ORIGINS` | Primary browser origin and optional comma-separated HTTPS or HTTP origins |
| `TRUST_PROXY_HOPS` | Number of trusted proxy hops, default zero. Set it only when the API is reachable exclusively through that proxy topology. |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | Independent signing keys. Generate each with `openssl rand -hex 48` or your secret manager. Keep the keys stable across restarts. |
| `LOCAL_USER_EMAIL`, `LOCAL_USER_PASSWORD`, `LOCAL_USER_NAME` | Optional first-run administrator. Choose an unused email and a unique password of 16 to 72 bytes. Existing accounts retain their roles. |
| `DATA_ROOT` | Storage root for audio, artwork, backups, and the default SQLite database. Persist this directory when deploying in a container. |
| `SQLITE_PATH` or `DATABASE_URL` | Optional SQLite file override. A relative `file:` URL resolves from `backend/prisma`. `SQLITE_PATH` takes precedence. |
| `MAX_UPLOAD_MB` | Maximum audio file size, from 1 to 100 MB |
| `ALLOW_GUEST_MUTATIONS` | Opt-in shared guest state for local development only |

Production requires both signing keys. Deploying this update signs users out of sessions issued by older releases. Rotate any previously deployed example signing keys and default local or demo passwords. The API uses bearer tokens with a 15-minute access lifetime, single-use rotating refresh tokens, and a seven-day session limit. Logout revokes the current session and leaves other sessions active.

## Database upgrades

`npm run db:migrate` applies the versioned SQL in `prisma/migrations` to the database configured for the server. `npm run prisma:push` is a compatibility alias for this command. The runner applies pending migrations in a single transaction and checks the contents of previously applied migrations. This release adds the session table and indexes and can adopt the existing library schema. Back up the SQLite database and media before upgrading a deployed instance.

`npm run build` generates the client and compiles TypeScript. Run `npm start` on the deployment host. The server applies migrations before opening its listener, including when launched directly with Node or nodemon. `/health` and `/api/health` are liveness checks. `/ready` and `/api/ready` check that the database schema is available.

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

Backup ZIPs live under `data/backups`, with access restricted to the service account where supported. They contain library metadata and a consistent SQLite snapshot, including password hashes and session records. Keep ZIPs private. The API restores library records and media from the logical snapshot and keeps the live accounts and sessions.
