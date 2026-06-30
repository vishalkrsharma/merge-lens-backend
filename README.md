# MergeLens Backend

NestJS backend for MergeLens — an AI-powered GitHub PR review pipeline.

## Local development

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL (via [Neon](https://neon.tech))
- ngrok (for GitHub webhook tunnel)

### Setup

```bash
pnpm install
```

Copy `.env.example` to `.env.local` and fill in the required values.

### Run

```bash
pnpm start:dev     # watch mode
pnpm dev           # watch mode + ngrok tunnel (parallel)
```

### Database

```bash
pnpm studio              # open Prisma Studio
npx prisma migrate dev   # create and apply a new migration
pnpm migrate:deploy      # apply existing migrations (used in CI)
pnpm db:push             # push schema without migrations (prototyping only)
```

### Other scripts

```bash
pnpm github:jwt     # print a signed GitHub App JWT
pnpm db:reset       # clear all data
pnpm github:reset   # reset GitHub App installation state
```

## Neon preview databases

Every pull request automatically gets an isolated Neon DB branch (`preview/<branch-name>`). Migrations are applied via `prisma migrate deploy` and the connection string is posted as a PR comment.

### One-time local setup

Install `neonctl` and authenticate once, then install the git hook so your local `DATABASE_URL` switches automatically when you change branches:

```bash
npm i -g neonctl         # install Neon CLI
neonctl auth login       # authenticate with your Neon account
pnpm hooks:install       # install the post-checkout git hook
```

After that, `git checkout feat/my-feature` will automatically update `DATABASE_URL` in `.env.local` to the preview branch for that feature. You can also trigger it manually:

```bash
pnpm db:preview
```

### GitHub Actions secrets required

| Secret | Value |
|--------|-------|
| `NEON_PROJECT_ID` | `falling-field-21678175` |
| `NEON_API_KEY` | Generate at console.neon.tech → Account settings → API keys |

## Testing

```bash
pnpm test           # unit tests
pnpm test:watch     # watch mode
pnpm test:cov       # coverage report
pnpm test:e2e       # end-to-end tests
```

## Deployment

| Environment | URL |
|-------------|-----|
| Production  | `https://merge-lens-backend.onrender.com` |
| Local       | `http://localhost:8080` |

API docs: `/api/docs` (Scalar UI) · `/api/swagger-json/json` (OpenAPI JSON)
