# Soundify Backend

Local REST API for Soundify, built with Node.js, Express, TypeScript, Prisma, and SQLite.

## Local data

- SQLite database: `../data/soundify.db`
- Audio, artwork, temporary files, and backups: `../data/`
- No PostgreSQL, Neon, Cloudinary, or other remote service is required.

## Development

```bash
npm install
npm run prisma:push
npm run prisma:seed
npm run dev
```

The API listens on `http://localhost:5000`. The root `.env.example` points Prisma to the SQLite file under the repository's `data/` directory. Copy it to `.env` for a local setup.

## Checks

```bash
npm run build
npm test
```

The default local account is `local@soundify.app` / `soundify`. Change the local password before exposing the backend to other devices.
