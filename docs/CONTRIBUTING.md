# Contributing

## Setup

```bash
pnpm install
cp .env.example .env  # Fill in required values
docker compose up -d  # Start Redis
pnpm start:dev
```

Required environment variables:
- `GROQ_API_KEY` — Groq API key (for AI and embeddings)
- `GITHUB_APP_ID` — GitHub App ID
- `GITHUB_INSTALLATION_ID` — GitHub App installation ID
- `GITHUB_WEBHOOK_SECRET` — Webhook secret for signature verification
- `REDIS_URL` — Redis connection URL (default: `redis://localhost:6379`)

## Development Workflow

1. Create a feature branch from `master`
2. Make changes following the style guide
3. Run `pnpm lint` and fix all issues
4. Run `pnpm build` to verify TypeScript compiles
5. Open a PR — MergeLens will review it automatically!

## Adding a New Agent

1. Create `src/agents/<name>.agent.ts` extending `BaseAgent`
2. Implement `review(context: ReviewContext): Promise<AgentResponse>`
3. Register in `src/agents/agents.module.ts`
4. Add to `OrchestratorService` in `src/orchestrator/orchestrator.service.ts`
5. Add findings to `CommentsService.postOrchestratorResults`

## Code Review Checklist

- No secrets or credentials in code
- All async functions have proper error handling
- No `any` types
- Services are properly injected via the NestJS DI container
- New modules are imported in `app.module.ts`
