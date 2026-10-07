# Soundify — Frontend (Next.js)

The modern client interface for Soundify, built with Next.js App Router, Tailwind CSS, Lucide React, and Zustand.

## Features
- **Standalone Client**: Communicates exclusively via REST API (`frontend/src/lib/api.ts`).
- **No Database / Secrets in Frontend**: Zero database libraries, Prisma, or cloud storage secrets exposed.
- **Persistent Global Audio Player**: Seamless playback continues during navigation.
- **Bulk Upload**: Multi-file drop zone (1-100+ files), client-side metadata parsing via `music-metadata-browser`, embedded artwork extraction, duplicate detection, and concurrency control.
- **Reactive State**: Zustand stores for Player (`player-store.ts`) and Auth (`auth-store.ts`).

## Development
```bash
# Install dependencies
npm install

# Start development server on http://localhost:3000
npm run dev

# Build production bundle
npm run build
```

## Environment Variables
Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```
