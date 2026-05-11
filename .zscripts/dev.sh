#!/bin/bash
# Custom dev script - runs production server instead of dev server
# to avoid OOM issues with Turbopack dev server

cd /home/z/my-project

# Build the production server if it doesn't exist
if [ ! -f ".next/standalone/server.js" ]; then
  echo "[DEV] Building production server..."
  npx next build
  cp -r public .next/standalone/public 2>/dev/null || true
  cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
fi

echo "[DEV] Starting production server on port 3000..."
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
