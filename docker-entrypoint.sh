#!/bin/sh
set -e

mkdir -p /app/public/uploads

echo "Running pre-migration fixes..."
# Rename VIEWER enum value to COMMISSIONER if it still exists (one-time migration)
# Strip Prisma-specific query params (e.g. ?schema=public) before passing to psql
PSQL_URL=$(echo "$DATABASE_URL" | sed 's/?.*//')
psql "$PSQL_URL" -c "ALTER TYPE \"Role\" RENAME VALUE 'VIEWER' TO 'COMMISSIONER';" 2>/dev/null || true

echo "Running Prisma migrations..."
npx prisma db push --skip-generate

echo "Seeding database..."
node prisma/seed.js || echo "Seed skipped (may already exist)"

echo "Starting server..."
exec node server.js
