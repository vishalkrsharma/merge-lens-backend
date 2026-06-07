# Deploying MergeLens on Render

All services (Web, PostgreSQL, Redis) are hosted on Render.

> **Free tier caveats:**
> - **Web Service (free):** Spins down after 15 min of inactivity. Use a cron job (e.g. [cron-job.org](https://cron-job.org)) to ping `/api/health` every 10 min to keep it warm.
> - **PostgreSQL (free):** 1 GB storage, expires after 90 days. Recreate or upgrade before expiry.
> - **Redis:** No free tier on Render — starts at $10/month. To stay fully free, use [Upstash Redis](https://upstash.com) instead (free, 10k commands/day).

---

## 1. Create PostgreSQL Database

1. Render Dashboard → **New → PostgreSQL**
2. Name: `merge-lens-db`
3. Plan: **Free**
4. Click **Create Database**
5. Once created, copy the **Internal Database URL** (use this for `DATABASE_URL`)

---

## 2. Create Redis Instance

1. Render Dashboard → **New → Redis**
2. Name: `merge-lens-redis`
3. Plan: **Starter ($10/mo)** *(no free tier available)*
4. Click **Create Redis**
5. Once created, copy the **Internal Redis URL** (use this for `REDIS_URL`)

> **To stay free:** Create an [Upstash](https://upstash.com) Redis DB instead and use that `REDIS_URL`. Upstash requires TLS — the URL starts with `rediss://`.

---

## 3. Prepare the GitHub App Private Key

Render doesn't support file mounts on free/starter plans. Pass the PEM as an env var.

Run this locally to get a single-line version of your private key:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n",$0;}' keys/merge-lens-private-key.pem
```

Copy the output — you'll paste it as `GITHUB_PRIVATE_KEY` in step 4.

---

## 4. Create the Web Service

1. Render Dashboard → **New → Web Service**
2. Connect your GitHub repository
3. Configure:

| Field | Value |
|---|---|
| **Name** | `merge-lens-backend` |
| **Runtime** | Node |
| **Build Command** | `npm install -g pnpm && pnpm install && pnpm build` |
| **Start Command** | `pnpm start:prod` |
| **Release Command** | `npx prisma migrate deploy` |
| **Plan** | Free |

4. Under **Environment Variables**, add all variables from the table below
5. Click **Create Web Service**

---

## 5. Environment Variables

Set these in the Render web service dashboard under **Environment**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Internal Database URL from step 1 |
| `REDIS_URL` | Internal Redis URL from step 2 (or Upstash URL) |
| `GOOGLE_API_KEY` | Your Google AI Studio API key |
| `GITHUB_APP_ID` | Your GitHub App numeric ID |
| `GITHUB_CLIENT_ID` | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App client secret |
| `GITHUB_WEBHOOK_SECRET` | Secret set in your GitHub App webhook config |
| `GITHUB_PRIVATE_KEY` | Single-line PEM output from step 3 |
| `BETTER_AUTH_SECRET` | A random 32+ char secret string |
| `FRONTEND_URL` | Your frontend's URL (for CORS + OAuth redirect) |
| `PORT` | `10000` *(Render's default port)* |
| `NODE_ENV` | `production` |

> **Generate `BETTER_AUTH_SECRET`:** run `openssl rand -base64 32` locally.

---

## 6. Update GitHub App Settings

After your first deploy, Render assigns a URL like `https://merge-lens-backend.onrender.com`.

1. Go to **GitHub → Settings → Developer Settings → GitHub Apps → MergeLens**
2. Update **Webhook URL** to:
   ```
   https://merge-lens-backend.onrender.com/api/webhooks/github
   ```
3. Update **Callback URL** (OAuth) to:
   ```
   https://merge-lens-backend.onrender.com/api/auth/callback/github
   ```

---

## 7. Keep-Alive Cron (Free Tier Only)

To prevent the free web service from spinning down and missing webhooks:

1. Go to [cron-job.org](https://cron-job.org) → create a free account
2. New cron job → URL: `https://merge-lens-backend.onrender.com/api/health`
3. Schedule: every **10 minutes**

---

## Deployment Checklist

- [ ] PostgreSQL created and `DATABASE_URL` copied
- [ ] Redis created (Render or Upstash) and `REDIS_URL` copied
- [ ] All environment variables set in Render
- [ ] `GITHUB_PRIVATE_KEY` set as single-line PEM
- [ ] GitHub App webhook URL updated to Render domain
- [ ] GitHub App OAuth callback URL updated
- [ ] Keep-alive cron configured (free tier)
- [ ] Start Command confirmed as `pnpm start:prod` (not `pnpm run start` — that re-compiles TypeScript and OOMs on free tier)
- [ ] First deploy succeeded and `prisma migrate deploy` ran in release step
