FROM node:20-alpine AS base

# --- Builder ---
FROM base AS builder
WORKDIR /app

COPY package.json package-lock.json* ./
COPY prisma ./prisma/
RUN npm install

COPY . .
RUN npm run build

# Compile seed script to JS so the runner doesn't need tsx
RUN npx tsx --compile prisma/seed.ts > /dev/null 2>&1 || true
RUN test -f prisma/seed.js || npx esbuild prisma/seed.ts --bundle --platform=node --outfile=prisma/seed.js --external:@prisma/client 2>/dev/null || true

# --- Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install prisma CLI and psql client for runtime migrations
RUN apk add --no-cache postgresql-client
RUN npm install -g prisma@6

COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# Copy standalone output (includes node_modules with @prisma/client)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Save the original standalone server.js (contains embedded nextConfig)
# then override with our custom server that adds WebSocket support
RUN cp /app/server.js /app/server.standalone.js
COPY --from=builder /app/server.js ./server.js

# Copy modules needed by custom server (not included in standalone output)
COPY --from=builder /app/node_modules/ws ./node_modules/ws
COPY --from=builder /app/node_modules/nodemailer ./node_modules/nodemailer
# next-auth/jwt for WebSocket chat user identification
COPY --from=builder /app/node_modules/next-auth ./node_modules/next-auth
COPY --from=builder /app/node_modules/jose ./node_modules/jose
COPY --from=builder /app/node_modules/@panva ./node_modules/@panva
COPY --from=builder /app/node_modules/uuid ./node_modules/uuid
COPY --from=builder /app/node_modules/@babel ./node_modules/@babel
COPY --from=builder /app/node_modules/preact ./node_modules/preact
COPY --from=builder /app/node_modules/preact-render-to-string ./node_modules/preact-render-to-string
COPY --from=builder /app/node_modules/oauth ./node_modules/oauth
COPY --from=builder /app/node_modules/openid-client ./node_modules/openid-client
COPY --from=builder /app/node_modules/cookie ./node_modules/cookie

# Seed script
COPY --from=builder /app/prisma/seed.js ./prisma/seed.js

# Fix Windows line endings and make executable
RUN sed -i 's/\r$//' ./docker-entrypoint.sh && chmod +x ./docker-entrypoint.sh
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["./docker-entrypoint.sh"]
