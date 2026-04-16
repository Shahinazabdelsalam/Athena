# Prompt for Claude Code — Athena VM Setup

Copy and paste this entire prompt into Claude Code on your new Scaleway VM:

---

Set up this Ubuntu server for a Node.js production application called Athena. Install and configure everything from scratch. This is a fresh Scaleway DEV1-S VM in Paris (fr-par).

## What to install

1. **System updates** — apt update && apt upgrade
2. **Node.js 22 LTS** — via NodeSource (not snap, not nvm — this is a server)
3. **PostgreSQL 16** — installed locally, create a database called `athena` and a user called `athena` with a strong random password
4. **Redis 7** — installed locally, default config, bind to localhost only
5. **PM2** — installed globally via npm, set up to start on boot (pm2 startup)
6. **Caddy** — installed as a reverse proxy for HTTPS with automatic Let's Encrypt certificates
7. **Git** — should already be there, but confirm

## PostgreSQL setup

- Create database: `athena`
- Create user: `athena` with a strong random password (save it, I'll need it)
- Grant all privileges on database `athena` to user `athena`
- Configure pg_hba.conf for local md5 authentication
- Only listen on localhost (no external access)

## Redis setup

- Bind to 127.0.0.1 only
- No password needed (localhost only)
- Enable persistence (appendonly yes)
- Set maxmemory to 256mb with allkeys-lru eviction policy

## Caddy setup

Create a Caddyfile at /etc/caddy/Caddyfile that:
- Reverse proxies from port 443 (HTTPS) to localhost:3000 (the Next.js app)
- Handles automatic HTTPS via Let's Encrypt
- Use a placeholder domain for now: `athena.example.com` (I'll replace it with the real domain later)
- Add security headers (X-Frame-Options, X-Content-Type-Options, etc.)

## Firewall (ufw)

- Allow SSH (port 22)
- Allow HTTP (port 80) — needed for Let's Encrypt
- Allow HTTPS (port 443)
- Deny everything else
- Enable ufw

## Create app directory

- Create `/home/athena/app` as the application directory
- Create a system user `athena` (no login shell) to run the app
- Set proper ownership

## PM2 ecosystem file

Create `/home/athena/app/ecosystem.config.cjs` with two processes:

```javascript
module.exports = {
  apps: [
    {
      name: 'athena-app',
      script: '.next/standalone/server.js',
      cwd: '/home/athena/app',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_URL: 'postgresql://athena:PASSWORD@localhost:5432/athena',
        REDIS_URL: 'redis://localhost:6379'
      }
    },
    {
      name: 'athena-worker',
      script: 'dist/worker.js',
      cwd: '/home/athena/app',
      instances: 1,
      env: {
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://athena:PASSWORD@localhost:5432/athena',
        REDIS_URL: 'redis://localhost:6379'
      }
    }
  ]
};
```

Replace PASSWORD with the actual PostgreSQL password you generated.

## Environment file

Create `/home/athena/app/.env` with:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://athena:PASSWORD@localhost:5432/athena
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=placeholder_I_will_fill_later
RESEND_API_KEY=placeholder_I_will_fill_later
STRIPE_SECRET_KEY=placeholder_I_will_fill_later
NEXT_PUBLIC_APP_URL=https://athena.example.com
```

## Verify everything works

After setup, run these checks and show me the results:
- `node --version` (should be 22.x)
- `psql -U athena -d athena -c "SELECT 1;"` (PostgreSQL works)
- `redis-cli ping` (should return PONG)
- `pm2 --version` (PM2 installed)
- `caddy version` (Caddy installed)
- `sudo ufw status` (firewall active)
- `systemctl status postgresql` (running)
- `systemctl status redis` (running)
- `systemctl status caddy` (running)

## Important

- Do NOT install Docker — we're running everything directly on the VM
- Do NOT install nginx — we're using Caddy
- All services should start automatically on reboot
- PostgreSQL and Redis must only listen on localhost (not exposed to the internet)
- Save the PostgreSQL password somewhere I can see it
