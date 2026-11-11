# =======================================================
# Soundify / PigPlayer All-In-One Production Dockerfile
# Builds & runs both Backend (Express) and Frontend (Next.js)
# =======================================================

# Stage 1: Build Backend
FROM node:22-bookworm-slim AS backend-builder
WORKDIR /build/backend

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY backend/package*.json ./
RUN npm ci

COPY backend/ ./
RUN npx prisma generate && npx tsc

# Stage 2: Build Frontend
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./

ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production
ARG NEXT_PUBLIC_API_URL=/api
ARG NEXT_PUBLIC_BACKEND_PORT=5000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_BACKEND_PORT=$NEXT_PUBLIC_BACKEND_PORT

# Next.js 16 build (retry in case of first-run security prompt)
RUN npm run build || npm run build

# Stage 3: All-In-One Production Runner
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=5000 \
    FRONTEND_PORT=3000 \
    HOSTNAME="0.0.0.0" \
    DATA_ROOT=/app/data \
    SQLITE_PATH=/app/data/soundify.db \
    CLIENT_URL=http://localhost:3000 \
    BACKEND_INTERNAL_URL=http://127.0.0.1:5000 \
    NEXT_PUBLIC_API_URL=/api

RUN apt-get update && apt-get install -y --no-install-recommends openssl curl ca-certificates bash && rm -rf /var/lib/apt/lists/*

# Setup backend
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --omit=dev
COPY --from=backend-builder /build/backend/node_modules/.prisma ./node_modules/.prisma
COPY --from=backend-builder /build/backend/node_modules/@prisma ./node_modules/@prisma
COPY --from=backend-builder /build/backend/dist ./dist
COPY --from=backend-builder /build/backend/prisma ./prisma
COPY --from=backend-builder /build/backend/scripts ./scripts

# Setup frontend
WORKDIR /app/frontend
COPY --from=frontend-builder /build/frontend/public ./public
COPY --from=frontend-builder /build/frontend/.next/standalone ./
COPY --from=frontend-builder /build/frontend/.next/static ./.next/static

# Persistent data directory
WORKDIR /app
RUN mkdir -p /app/data/audio /app/data/artwork /app/data/temp /app/data/backups

# Setup entrypoint
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN sed -i 's/\r$//' /app/docker-entrypoint.sh && chmod +x /app/docker-entrypoint.sh

VOLUME ["/app/data"]

EXPOSE 3000 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ && curl -f http://localhost:5000/api/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

