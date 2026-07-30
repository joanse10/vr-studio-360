#!/bin/sh
set -e

echo "Fixing uploads directory permissions..."
chown -R nextjs:nodejs /app/public/uploads 2>/dev/null || true

echo "Installing prisma CLI..."
npm install --no-save prisma@5.19.1 2>&1 || true

echo "Running prisma db push..."
npx prisma db push --accept-data-loss 2>&1 || true

echo "Running seed..."
npx tsx prisma/seed.ts 2>&1 || true

echo "Starting application..."
su -s /bin/sh nextjs -c "exec node server.js"
