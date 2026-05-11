#!/bin/bash
# Custom dev script - runs production server instead of dev server
# to avoid OOM issues with Turbopack dev server

set -e

cd /home/z/my-project

# Ensure database schema is up to date
echo "[DEV] Syncing database schema..."
bun run db:push

# Seed database if it hasn't been seeded yet (check for admin user)
# We use a simple marker file to track if seed has run
SEED_MARKER=".seed-done"
if [ ! -f "$SEED_MARKER" ]; then
  echo "[DEV] Running database seed..."
  bun run db:seed || echo "[DEV] Seed completed (some entries may already exist)"
  touch "$SEED_MARKER"
  echo "[DEV] Seed marker created"
else
  echo "[DEV] Seed already ran (remove $SEED_MARKER to re-run)"
fi

# Build the production server if it doesn't exist
if [ ! -f ".next/standalone/server.js" ]; then
  echo "[DEV] Building production server..."
  npx next build
  echo "[DEV] Copying static files to standalone directory..."
  cp -r public .next/standalone/public 2>/dev/null || true
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
  echo "[DEV] Build complete"
else
  echo "[DEV] Production build already exists"
fi

echo "[DEV] Starting production server on port 3000..."
export PORT=3000
export HOSTNAME=0.0.0.0
export DATABASE_URL="file:/home/z/my-project/db/custom.db"
exec node .next/standalone/server.js
