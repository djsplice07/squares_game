# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Super Bowl Squares — a web application that runs a 10x10 grid-based betting game for the Super Bowl. Players purchase squares, random numbers (0-9) are assigned to each row/column for AFC and NFC teams, and winners are determined by the last digit of each team's score at the end of each quarter.

This is a rewrite of a legacy PHP/MySQL application (preserved in `legacy/` for reference). The legacy app has significant security issues (SQL injection, plaintext passwords, no CSRF protection) and uses early-2000s HTML patterns.

## Tech Stack

- **Framework**: Next.js 14 (App Router) with TypeScript
- **Database**: PostgreSQL 16 via Prisma ORM
- **Auth**: NextAuth.js with JWT strategy and credentials provider
- **Styling**: Tailwind CSS with custom theme (dark mode, `primary`/`accent` color scales, glow shadows)
- **Real-time**: WebSocket server (ws) for live chat, mounted at `/ws/chat`
- **Deployment**: Docker Compose (app + postgres)

## Development Commands

```bash
# Start everything (build + run with Docker Compose)
docker compose up --build -d

# View logs
docker compose logs app --tail 50
docker compose logs app -f        # follow

# Rebuild after code changes
docker compose up --build -d

# Stop
docker compose down

# Database operations (run from host with node_modules present)
npx prisma db push          # sync schema to DB
npx prisma generate         # regenerate client after schema changes
npx tsx prisma/seed.ts      # seed default data
npm run db:migrate          # deploy prisma migrations (production)
npm run db:generate         # regenerate Prisma client (alias)

# Dev server (requires local postgres with DATABASE_URL pointing to it)
npm run dev                 # runs tsx server.ts -> server.js
```

**Note**: The app runs inside Docker where `DATABASE_URL` points to the `db` service. For local dev outside Docker, update `DATABASE_URL` to `postgresql://superbowl:superbowl@localhost:5432/superbowl`.

## Environment Variables

Required variables (see `.env.example`):
- `DATABASE_URL` — PostgreSQL connection string
- `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` — Database credentials
- `NEXTAUTH_SECRET` — Random secret for JWT signing (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` — Full URL where app is deployed (e.g., `http://localhost:3000`)

## Architecture

### Custom Server (`server.js`)

Next.js runs behind a custom HTTP server that also handles WebSocket upgrades. This is required for the live chat and real-time grid update features. The server has two boot modes:

- **Dev mode** (`NODE_ENV !== 'production'`): Uses the standard `next()` API with `app.prepare()`, creates its own HTTP server, and adds WebSocket upgrade handling on `/ws/chat`.
- **Production standalone mode**: Monkey-patches `http.createServer` to intercept the HTTP server that Next.js's `startServer()` creates, injecting WebSocket upgrade handling for `/ws/chat` before Next.js registers its own upgrade handler. Reads the embedded `nextConfig` from `server.standalone.js` (saved during Docker build) and sets `__NEXT_PRIVATE_STANDALONE_CONFIG` env var so Next.js skips webpack loading.

The server also runs:
- Chat message broadcasting with blacklist filtering and JWT token decoding for user identity
- `squares:changed` → `squares:refresh` broadcast for real-time grid updates
- Payment reminder scheduler (15-minute interval) that checks unconfirmed squares approaching grace period deadline

`server.ts` is just a dev shim that requires `server.js`.

**Critical Dockerfile detail**: The standalone build output includes its own `server.js`. The Dockerfile saves it as `server.standalone.js` then copies our custom `server.js` over it. Extra node_modules not included in standalone output (`ws`, `nodemailer`, `next-auth`, `jose`, `@panva`, `uuid`, `@babel`, `preact`, `oauth`, `openid-client`, `cookie`) are explicitly copied in the Dockerfile.

### Authentication Flow

- `src/lib/auth.ts` — NextAuth config with credentials provider (email/password, bcrypt)
- `src/middleware.ts` — Route protection: public routes (`/`, `/login`, `/register`, `/signup`, `/setup`, `/api/auth`, `/api/setup`), admin routes require ADMIN or VIEWER role, `/my-squares` requires any authenticated user
- `src/types/index.ts` — Augments NextAuth session/JWT types with `role` and `id`
- JWT tokens carry `role` (ADMIN/VIEWER/PLAYER) and `id` fields

### Database Pattern

- Prisma schema at `prisma/schema.prisma`
- Singleton pattern: `GameSettings`, `Score`, and `EmailSettings` use `id: "singleton"` — there's always exactly one row
- `prisma/seed.ts` — Seeds 100 squares (positions "00"-"99"), default settings, default score row, email settings, and 8 email templates (welcome, square_confirmation, square_confirmed, square_released, payment_reminder, numbers_assigned, game_results, custom). Uses upserts so it's idempotent. Email templates use `update: {}` to preserve manual edits (only creates, never overwrites).
- Shared Prisma client at `src/lib/prisma.ts` (global singleton to avoid connection exhaustion in dev)

### Page Structure

- `/` — Main page: 10x10 grid + chat window. Redirects to `/setup` if no admin exists.
- `/setup` — First-run admin account creation
- `/login`, `/register` — Auth pages
- `/signup?squares=01,02,...` — Square purchase form (guest or authenticated)
- `/my-squares` — Player's own squares (requires auth)
- `/admin/*` — Admin panel with sidebar nav (`layout.tsx` is a client component with role-based nav filtering)

Admin sub-pages: dashboard, squares, numbers, scores, balance, settings, users, email, chat, backup. Viewers are restricted from settings, users, and backup.

### API Routes (`src/app/api/`)

All API routes use `getServerSession(authOptions)` for auth checks. Pattern: GET for reads, POST for creates, PUT for full updates, PATCH for partial updates.

Key routes:
- `squares/` — GET (list all), POST (purchase), PATCH (admin: confirm/release/reserve/bulk-reserve/edit)
- `settings/` — GET (public), PUT (admin-only, handles payment methods separately)
- `numbers/` — POST generates random 0-9 shuffles for NFC/AFC axes
- `scores/` — PUT updates quarter scores and determines winners
- `backup/` — Export/import game data
- `upload/` — Image upload for team/SB logos

### Component Patterns

- Server components fetch data directly via Prisma (e.g., `page.tsx` for `/`)
- Client components use `'use client'` and fetch via API routes
- `src/components/Providers.tsx` wraps app with `SessionProvider` + `WebSocketProvider` + `ToastProvider`
- Grid components: `SquareGrid` (10x10 table with real-time WS refresh), `SquareCell` (individual cell), `GridHeader` (team logos/matchup banner/event info)
- `src/lib/ws.tsx` — React Context `WebSocketProvider` shares a single WebSocket connection app-wide. Exports `useWebSocket()` hook returning `{ messages, connected, sendMessage, deleteMessage, squaresVersion, notifySquaresChanged }`. The `squaresVersion` counter increments on `squares:refresh` events; components watch it to re-fetch grid data.

### Styling Conventions

- Dark theme throughout: `bg-gray-950` base, `bg-gray-900` cards
- Custom Tailwind classes in `globals.css`: `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.btn-success`, `.input-field`, `.card`, `.card-elevated`
- Custom color scales: `primary` (blue), `accent` (purple), `success`, `warning`, `danger`
- Custom glow shadows: `shadow-glow-sm`, `shadow-glow`, `shadow-glow-lg`, `shadow-glow-green`, `shadow-glow-amber`

### Docker Setup

- `Dockerfile` — Multi-stage build: builder (npm install, next build, compile seed script) -> runner (standalone output, prisma CLI for runtime migrations). The runner stage saves the original standalone `server.js` as `server.standalone.js` then copies our custom `server.js` over it, and copies extra node_modules not included in standalone output.
- `docker-entrypoint.sh` — Runs `prisma db push`, seeds DB, then starts `node server.js`
- `docker-compose.yml` — Two services: `app` (port 3000) and `db` (postgres:16-alpine, port 5432, healthcheck)

### Next.js Configuration

`next.config.js` settings:
- `output: 'standalone'` — Minimal production build with embedded dependencies for Docker
- `serverComponentsExternalPackages: ['nodemailer']` — Prevents bundling nodemailer (requires native modules)
- `images: { unoptimized: true }` — Disables Next.js image optimization for simpler Docker deployment

### Real-time Updates

Two real-time channels share a single WebSocket connection per client:
- **Chat**: Messages are stored in DB and broadcast to all connected clients
- **Grid refresh**: When squares change (purchase, admin action), the acting client sends `{type: 'squares:changed'}` via WS. The server broadcasts `{type: 'squares:refresh'}` to all clients. Clients increment `squaresVersion` which triggers a re-fetch of `/api/squares`.

### Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`). Use `@/lib/prisma`, `@/components/ui/Button`, etc.

## Game Logic

- 100 squares in a 10x10 grid, positions "00" through "99" (row digit + column digit)
- Row = NFC team axis, Column = AFC team axis
- Numbers (0-9) are randomly shuffled independently for each axis; can only be generated when all 100 squares are claimed
- Winners: last digit of each team's quarter score maps to the grid number → intersecting square wins
- Four quarters: Q1 (first), Q2 (half), Q3 (third), Final — each with configurable payout percentage
- Max 10 squares per purchase submission
- Squares can be guest-purchased (name+email) or purchased by authenticated players

## Feature Requirements

### Role-Based Access (3 roles)

**Admin** (full control): manage all accounts, game settings (bet amount, teams, logos, payouts, payment methods, rules), generate numbers, edit squares, edit scores, email system, backup/restore, chat moderation

**Viewer** (limited admin — for co-commissioners): view balance sheet, edit squares, update scores, send emails, moderate chat

**Player** (authenticated participant): view own squares, purchase squares, live chat, change own name/password

### Email System
- Templates with `{{placeholder}}` variables (stored in DB, seeded with defaults)
- Configurable SMTP/SSL transport via `EmailSettings`
- `src/lib/email.ts` — `sendEmail()`, `renderTemplate()`, `getTransporter()` core functions
- `src/lib/autoEmail.ts` — Fire-and-forget automated emails triggered by game events:
  - `sendWelcomeEmail` — on user registration (from `POST /api/users`)
  - `sendPurchaseConfirmationEmail` — on square purchase (from `POST /api/squares`)
  - `sendSquareConfirmedEmail` / `sendSquareReleasedEmail` — on admin confirm/release (from `PATCH /api/squares`)
  - `sendNumbersAssignedEmails` — to all participants when numbers generated (from `POST /api/numbers`)
  - `sendGameResultsEmails` — to all participants when final score entered (from `PUT /api/scores`)
  - `checkPaymentReminders` — scheduled in server.js every 15 minutes, sends reminders 2 hours before grace period deadline
- Admin Send tab (`POST /api/email`) populates all template variables per-recipient from DB (squares, amount, payment info, winners)
- Available template variables: `{{name}}`, `{{email}}`, `{{squares}}`, `{{amountDue}}`, `{{commissioner}}`, `{{eventName}}`, `{{gameUrl}}`, `{{graceHours}}`, `{{paymentInstructions}}`, `{{paymentMethods}}`, `{{winners}}`, `{{rulesText}}`

### Live Chat
- WebSocket-based, embedded on front page (YouTube/Twitch live-chat style)
- Blacklist-based word filtering
- Admin/viewer can delete messages

### Backup/Restore
- Config-only or full (config + square/game data) export/import

## Testing

No testing framework is currently configured. To add tests, consider installing Jest or Vitest with React Testing Library.

## Assets

Team logos in `public/images/`: `afc-{team}.png` and `nfc-{team}.png` for all 32 NFL teams, plus conference logos, generic placeholders, Super Bowl event logos, and background images.
