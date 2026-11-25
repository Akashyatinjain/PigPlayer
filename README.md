# Soundify / PigPlayer — Offline-First Music Player

Personal music library that runs entirely on your machine or inside Docker.

```
Internet is NOT required after install.

localhost:3000   →  Next.js frontend (UI & Player)
localhost:5000   →  Express backend (API)
data/soundify.db →  SQLite database
data/audio       →  Local audio files
data/artwork     →  Local cover artwork
```

## Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 16 (App Router), TypeScript, Tailwind CSS, Zustand |
| Backend | Node.js 22, Express, TypeScript, Zod |
| Database | SQLite via Prisma |
| Storage | Local filesystem (`data/`) |
| Container | Docker & Docker Compose |

No PostgreSQL, Neon, Cloudinary, Spotify, or other cloud services are required at runtime.

---

## Docker Deployment

You can deploy PigPlayer on Docker using either **Docker Compose** (recommended for decoupled microservices) or a **Single All-in-One Container** (ideal for single-container cloud hosting like Railway, Render, Fly.io, or Synology/Unraid NAS).

### Option 1: Docker Compose (Recommended)

Spins up separate, connected containers for Next.js (`frontend`) and Express (`backend`) with persistent SQLite storage:

```bash
# 1. Fill in both signing keys and optional administrator credentials
cp .env.docker.example .env.docker

# 2. Build and start services in background
docker compose --env-file .env.docker up -d --build

# 2. View logs
docker compose --env-file .env.docker logs -f

# 3. Stop services
docker compose --env-file .env.docker down
```

- **Frontend:** [http://localhost:3000](http://localhost:3000)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **Data Persistence:** Your SQLite database and uploaded tracks persist automatically in `./data`.

### Option 2: All-in-One Container

Builds a single self-contained container running both backend and frontend:

```bash
# 1. Build the all-in-one image
docker build -t pigplayer .

# 2. Run container with persistent local data
docker run -d \
  --env-file .env.docker \
  -p 3000:3000 \
  -p 5000:5000 \
  -v ${PWD}/data:/app/data \
  --name pigplayer \
  pigplayer

# 3. View logs
docker logs -f pigplayer
```

### Administrator setup

Set `LOCAL_USER_EMAIL` and `LOCAL_USER_PASSWORD` to create an administrator on the first startup. See the [backend setup guide](backend/README.md) for key generation, role behavior, and SQLite upgrades.

---

## Local Development (Without Docker)

```bash
# 1. Install dependencies
npm install
npm install --prefix backend
npm install --prefix frontend

# 2. Configure environment
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# 3. Synchronize database & seed demo tracks
npm run prisma:push --prefix backend
npm run seed

# 4. Start frontend + backend together
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## What Works Offline

After setup, disconnect the internet and you can still:

- Play / pause / seek / next / previous / shuffle / repeat / volume
- Search the local library
- Create / edit / delete playlists
- Favorite songs
- View recently played
- Upload local audio (metadata + embedded artwork extracted locally)
- Download tracks from the library
- Backup / restore / export library JSON

The browser talks only to `localhost:5000` (or proxies through `/api`). No external APIs.

---

## Project Layout

```text
PigPlayer/
├── Dockerfile              # All-in-one production Docker container
├── docker-compose.yml      # Multi-container Docker Compose configuration
├── docker-entrypoint.sh    # Container entrypoint & process orchestrator
├── .dockerignore           # Optimized build ignore rules
├── .env.docker.example     # Reference Docker environment settings
├── frontend/               # Next.js UI + player (runs on port 3000)
│   └── Dockerfile          # Dedicated Next.js standalone container
├── backend/                # Express API + Prisma SQLite (runs on port 5000)
│   └── Dockerfile          # Dedicated Express backend container
├── data/                   # Persistent storage volume
│   ├── soundify.db         # SQLite database
│   ├── audio/              # Uploaded music tracks
│   ├── artwork/            # Album art
│   ├── temp/               # Temporary uploads
│   └── backups/            # Library backups & exports
├── scripts/                # Database & storage utilities
└── package.json            # Monorepo scripts
```

## Scripts

| Command | Purpose |
|---|---|
| `docker compose up -d --build` | Build and start containerized stack |
| `npm run dev` | Start frontend + backend concurrently |
| `npm run build` | Production build both apps |
| `npm run start` | Run production builds locally |
| `npm test` | Backend API tests |
| `npm run seed` | Seed local user + demo WAV tracks |
| `npm run cleanup:storage -- --dry-run` | Find orphaned audio/artwork files |

## License

Private / personal use unless otherwise stated.
