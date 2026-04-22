# Athena — guide pour Claude

French-first SEO blog generator for women entrepreneurs. All user-facing copy is in French; code, comments, and this file are in English.

## Stack

- **Next.js 16** App Router, React 19, TailwindCSS v4 — deployed in standalone mode.
- **Auth.js v5 (NextAuth beta)** with Credentials + Prisma adapter, JWT sessions.
- **Prisma 5 + PostgreSQL** (local Postgres, DB `athena`).
- **BullMQ + Redis** for the article generation queue.
- **Anthropic SDK** (`@anthropic-ai/sdk`) — model is per-format, configurable via `ANTHROPIC_MODEL_LINKEDIN` / `ANTHROPIC_MODEL_BLOG` env vars. Defaults: `claude-haiku-4-5` for LinkedIn (short, cheap), `claude-sonnet-4-6` for Blog (longer, quality). Switch to `claude-opus-4-7` for max quality. Web search tool (`web_search_20250305`, `max_uses: 3`) is enabled for both — Anthropic server-side, no scraping code on our side.
- **Resend** for transactional email, **Stripe** scaffolded but disabled.
- **PM2** runs two processes in prod: `athena-app` (Next server) and `athena-worker` (BullMQ consumer).

## Architecture

```
User → /generate (server component, prefills saved business)
     → POST /api/generate ─► Post row (PENDING) + BullMQ job
                              │
                              ▼
                    athena-worker (dist/worker/index.js)
                              │
                    generateBlogPost() → Anthropic API
                              │
                    Post row → COMPLETED, email sent via Resend
     ← poll GET /api/jobs/:id every 2s
     → redirect to /dashboard/posts/:id
```

Two runtimes share code via `src/lib/**`:
- Next app bundles it normally.
- Worker is compiled separately with `tsconfig.worker.json` into `dist/` as CommonJS. Anything imported by `src/worker/index.ts` must stay compatible with that tsconfig (no Next-only APIs, no `"use client"` transitively).

## Key files

- `src/lib/ai/blog-generator.ts` — the single Claude call. System prompt is French, output parsed by regex (`TITRE:` / `META:` / `ARTICLE:`).
- `src/lib/queue.ts` — BullMQ queue singleton (`athena-blog-generation`).
- `src/lib/auth.ts` — NextAuth config. JWT strategy, so `session.user.id` is populated by the `jwt`/`session` callbacks.
- `src/app/api/generate/route.ts` — enforces `FREE_MONTHLY_LIMIT = 3`, rolls the monthly counter, persists `business` back onto the user for prefill.
- `src/app/generate/page.tsx` + `GenerateForm.tsx` — server wrapper loads saved `business`, client form submits + polls.
- `prisma/schema.prisma` — `User`, `Post` (+ `Account`/`Session` for the adapter, though we use JWT).

## Commands

```bash
# Dev
npm run dev                          # Next dev server only (worker must be run separately)

# Prod deploy flow
npm run build                        # Next standalone build
npx tsc -p tsconfig.worker.json      # builds worker into dist/
npx prisma migrate deploy            # apply pending migrations
pm2 restart athena-app athena-worker --update-env
```

Worker compile step is not in `package.json` scripts — run `tsc -p tsconfig.worker.json` manually when `src/worker/**` or `src/lib/**` changes.

## Env vars (`.env`)

`DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET`, `AUTH_URL`, `ANTHROPIC_API_KEY` (must be `sk-ant-api03-…`, **not** an `sk-ant-oat01-…` OAuth token — that will 401 with `invalid x-api-key`), `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_APP_URL`. Stripe vars are commented out.

## Conventions

- French for all user-visible strings (labels, errors, emails). Avoid accents in source code strings (`Creer`, not `Créer`) — matches the existing style.
- When editing the Claude prompt in `blog-generator.ts`, keep the exact output contract (`TITRE:` / `META:` / `ARTICLE:`) — `parseBlogResponse` depends on it.
- New DB changes: edit `schema.prisma`, create a migration folder under `prisma/migrations/<timestamp>_<name>/migration.sql`, run `prisma migrate deploy`, then `prisma generate`.
- After any change touching `src/worker/**` or shared `src/lib/**`, rebuild the worker AND restart `athena-worker` (PM2 caches `dist/`).

## Gotchas

- The worker runs from compiled JS in `dist/`, not from `src/`. TypeScript changes aren't live until recompile.
- `pm2 restart … --update-env` is required to pick up `.env` changes; plain `pm2 restart` keeps the old env.
- Redis must be configured with `maxmemory-policy noeviction` — BullMQ logs the warning on startup if not.
- Session uses JWT strategy, so the `Session` table exists but is unused. Don't rely on DB sessions.
- Free tier limit is a hard `>= 3` check per calendar month, reset lazily on next submit.
