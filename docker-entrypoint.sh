#!/bin/sh
set -e

echo "Running Prisma migrations..."
npx prisma db push --skip-generate

echo "Seeding database..."
node prisma/seed.js || echo "Seed skipped (may already exist)"

echo "Starting server..."
exec node server.js
