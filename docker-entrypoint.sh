#!/bin/sh
set -e

echo "Running prisma db push..."
npx prisma db push --accept-data-loss 2>&1 || true

echo "Running seed..."
npx tsx prisma/seed.ts 2>&1 || true

echo "Starting application..."
exec node server.js
