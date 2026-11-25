#!/bin/bash
set -e

echo "=================================================="
echo " Starting PigPlayer (Soundify) in Docker"
echo "=================================================="

# Synchronize SQLite database schema
echo "[Entrypoint] Synchronizing SQLite database schema..."
node /app/backend/scripts/migrate.js

# Graceful termination handler
cleanup() {
  echo "[Entrypoint] Received termination signal. Shutting down services..."
  if [ -n "$FRONTEND_PID" ]; then
    kill -TERM "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ]; then
    kill -TERM "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    wait "$FRONTEND_PID" 2>/dev/null || true
  fi
  if [ -n "$BACKEND_PID" ]; then
    wait "$BACKEND_PID" 2>/dev/null || true
  fi
  echo "[Entrypoint] PigPlayer stopped cleanly."
}

trap 'cleanup; exit 0' SIGTERM SIGINT SIGQUIT

# Start Express backend
# The standalone Next.js build rewrites /api to this internal port.
BACKEND_PORT=5000
echo "[Entrypoint] Starting Express backend on port ${BACKEND_PORT}..."
cd /app/backend
PORT="${BACKEND_PORT}" node dist/server.js &
BACKEND_PID=$!

# Wait for backend healthcheck
echo "[Entrypoint] Waiting for backend to become ready..."
READY=0
for i in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:${BACKEND_PORT}/api/ready" > /dev/null 2>&1; then
    echo "[Entrypoint] Backend is ready!"
    READY=1
    break
  fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    wait "$BACKEND_PID" || exit $?
    exit 1
  fi
  sleep 1
done

if [ "$READY" -ne 1 ]; then
  echo "[Entrypoint] Backend readiness timed out after 30 seconds."
  cleanup
  exit 1
fi

# Start Next.js frontend
UI_PORT="${FRONTEND_PORT:-3000}"
echo "[Entrypoint] Starting Next.js frontend on port ${UI_PORT}..."
cd /app/frontend
PORT="${UI_PORT}" HOSTNAME="0.0.0.0" BACKEND_INTERNAL_URL="http://127.0.0.1:${BACKEND_PORT}" node server.js &
FRONTEND_PID=$!

echo "=================================================="
echo " PigPlayer is running!"
echo " Web UI: http://localhost:${UI_PORT}"
echo " API:    http://localhost:${BACKEND_PORT}/api"
echo "=================================================="

# Wait for any process to exit
EXIT_CODE=0
wait -n "$BACKEND_PID" "$FRONTEND_PID" || EXIT_CODE=$?
echo "[Entrypoint] A service exited with status ${EXIT_CODE}. Shutting down container..."
cleanup
exit ${EXIT_CODE}

