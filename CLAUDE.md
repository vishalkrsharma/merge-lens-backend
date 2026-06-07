# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
pnpm start:dev          # Watch mode
pnpm build              # Compile to dist/
pnpm start:prod         # Run compiled output

# Database
pnpm studio             # Open Prisma Studio (no browser)
npx prisma migrate dev  # Run migrations in dev
npx prisma generate     # Regenerate client (also runs on postinstall)

# Infrastructure
pnpm redis:up           # Start Redis via Docker Compose (config/redis-compose.yml)
pnpm redis:down         # Stop Redis

# Webhook tunnel (requires ngrok)
pnpm tunnel:up          # Expose local server via ngrok fixed URL

# Utilities
pnpm github:jwt         # Print a signed GitHub App JWT (needs keys/merge-lens-private-key.pem)

# Tests
pnpm test               # Run all unit tests
pnpm test:watch         # Watch mode
pnpm test -- --testPathPattern=<file>  # Single test file

# Lint / Format
pnpm lint               # ESLint with auto-fix
pnpm format             # Prettier
```

## Architecture Overview

MergeLens is a NestJS backend that automatically reviews GitHub PRs using a multi-agent AI pipeline.

### Request Flow

```
GitHub Webhook → WebhooksController
  → PullRequestHandler (verifies HMAC signature, checks repo.isActive)
  → BullMQ queue (REVIEW_QUEUE = "review-pr")
  → ReviewProcessor (BullMQ worker)
      ├── GithubService: fetch PR details, head SHA, changed files (3 parallel calls)
      ├── RetrievalService: RAG lookup against in-memory vector store
      ├── OrchestratorService: run 4 agents in parallel (Promise.all)
      │     ├── BugAgent
      │     ├── SecurityAgent
      │     ├── PerformanceAgent
      │     └── StyleAgent
      │   → SummaryAgent (after the 4 agents complete)
      ├── CommentsService: post inline review comments + summary to GitHub
      └── PrismaService: persist Review, Finding[], ReviewSummary, ApiUsageLog
```

### AI Pipeline (`src/pipeline/`)

- **BaseAgent** — all 4 review agents extend this. Uses `gemini-3.5-flash` via `@google/generative-ai`. Returns `{ findings: AgentFinding[], summary: string }`. Strips markdown code fences before JSON parsing.
- **OrchestratorService** — runs the 4 agents in `Promise.all`, then feeds their output to `SummaryAgent`. Records durations via `MetricsService`.
- **AiReviewService** — an older single-pass review service (uses Zod for validation). Currently unused by the main pipeline but still registered.
- **RAG (`src/pipeline/rag/`)** — on startup, `RepositoryIndexService` reads every `.md` file from `./docs/`, splits by word count (500-word chunks, 50-word overlap), and embeds them with `gemini-embedding-2`. `VectorService` stores embeddings **in-memory** (no persistence). The first 2000 characters of the diff are used as the retrieval query.

### GitHub Integration (`src/integrations/github/`)

- **GithubService** — wraps `octokit/App` for GitHub App authentication (reads private key from `keys/merge-lens-private-key.pem`). Provides both installation-token-based calls (PR data, posting comments) and user-token-based calls (listing repos, managing installations).
- **Webhook signature verification** — `src/integrations/github/verify-signature.ts` uses `GITHUB_WEBHOOK_SECRET`. Checked in `PullRequestHandler` and `InstallationHandler` before processing.

### Authentication (`src/core/auth/`)

Uses **better-auth** with a Prisma adapter. GitHub OAuth is the only social provider. The `AuthGuard` calls `auth.api.getSession()` on every protected request and attaches `session.user` to `request.user`.

**GitHub App installation linking** is handled in a `databaseHooks.account.create.after` hook: when a user signs in with GitHub after having already installed the App, the `PendingInstallation` row is consumed, `user.hasGithubApp` is set to `true`, and repos are synced. If the App is installed before sign-in, the installation is stored in `PendingInstallation` and resolved on first OAuth sign-in.

### Webhook Handlers (`src/modules/webhooks/handlers/`)

- **PullRequestHandler** — triggers reviews on `opened`, `synchronize`, `reopened`. All other PR actions are acknowledged but ignored.
- **InstallationHandler** — handles GitHub App `installation` and `installation_repositories` events to keep `Repository` records in sync with what's actually installed.

### Repository & Review Settings

Each `Repository` has `enabledAgents: AgentType[]` and `severityThreshold: Severity`. These are persisted but the pipeline currently runs all 4 agents regardless — filtering by these settings is not yet enforced. `isActive: false` skips queuing entirely.

### Observability (`src/core/observability/`)

- **MetricsService** — Prometheus histograms/counters exposed at `GET /api/metrics` via `MetricsController`.
- **TracingService** — lightweight span wrapper (no external tracing backend wired up).
- **LoggerService** — structured log helpers (webhook received, RAG retrieval, review complete, etc.) on top of `nestjs-pino`.

### Key Environment Variables

| Variable                  | Purpose                             |
| ------------------------- | ----------------------------------- |
| `DATABASE_URL`            | PostgreSQL (Neon) connection string |
| `REDIS_URL`               | BullMQ connection                   |
| `GOOGLE_API_KEY`          | Gemini LLM + embeddings             |
| `GITHUB_APP_ID`           | GitHub App numeric ID               |
| `GITHUB_CLIENT_ID/SECRET` | OAuth app credentials               |
| `GITHUB_WEBHOOK_SECRET`   | HMAC webhook verification           |
| `BETTER_AUTH_SECRET`      | Session signing key                 |
| `FRONTEND_URL`            | CORS origin + OAuth callback base   |

The private key for the GitHub App must be placed at `keys/merge-lens-private-key.pem`.

### Path Aliases

`@/` maps to `src/` (configured in `tsconfig.json` and Jest `moduleNameMapper`).

### API Docs

Swagger JSON is served at `/api/swagger-json/json`. Scalar UI is at `/api/docs`. The better-auth OpenAPI schema is merged in at startup (`src/main.ts`).
