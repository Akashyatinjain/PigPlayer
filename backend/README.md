# Soundify — Backend (Node.js + Express + Prisma)

The standalone REST API server for Soundify, powered by Node.js, Express, TypeScript, Prisma ORM, and PostgreSQL.

## Features
- **Clean N-Tier Architecture**: Route -> Controller -> Service -> Repository -> Prisma -> PostgreSQL.
- **Robust Security**: Helmet security headers, CORS strict origins, rate limiting, and Zod schema validations.
- **JWT Authentication**: Short-lived access tokens and refresh tokens with bcrypt password hashing.
- **Audio & Artwork Storage**: Storage abstraction (`StorageService`) supporting Cloudinary or local disk static serving.
- **Duplicate Prevention**: SHA-256 audio hash checking and metadata comparison.
- **Authorized Downloads**: Server validates download permissions before generating file URLs.

## Development
```bash
# Install dependencies
npm install

# Push Prisma schema to PostgreSQL
npm run prisma:push

# Seed demo tracks & test user
npm run prisma:seed

# Run automated test suite
npm test

# Run development server on http://localhost:5000
npm run dev

# Build production bundle
npm run build
```

## Environment Variables
Create `.env`:
```env
PORT=5000
CLIENT_URL=http://localhost:3000
DATABASE_URL=postgresql://user:pass@host:5432/neondb?sslmode=require
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```
