# Architecture

MergeLens is a NestJS application that provides AI-powered GitHub PR reviews.

## System Components

### Webhook Pipeline
GitHub sends PR events to `/api/webhooks/github`. The webhook handler verifies the signature and enqueues a review job in BullMQ (backed by Redis).

### Multi-Agent Review
The `ReviewProcessor` picks up jobs and runs the `AgentOrchestrator` which executes four specialized agents in parallel:
- **BugAgent**: detects null dereferences, race conditions, logic errors
- **SecurityAgent**: finds secrets, injection risks, auth issues
- **PerformanceAgent**: catches N+1 queries, expensive loops, blocking I/O
- **StyleAgent**: reviews naming, readability, maintainability

A **SummaryAgent** synthesizes all findings into an overall PR verdict.

### RAG (Retrieval-Augmented Generation)
The `RepositoryIndexService` indexes markdown docs at startup via Groq embeddings (nomic-embed-text-v1_5). During review, the `RetrievalService` fetches the top-5 relevant chunks and injects them into each agent's prompt, giving the AI repository-specific context.

### Observability
- Structured logging via `nestjs-pino`
- Prometheus metrics at `GET /api/metrics`
- Span tracing via `TracingService`

## Data Flow

```
GitHub PR Event
  → POST /api/webhooks/github
  → verify signature
  → enqueue job (BullMQ + Redis)
  → ReviewProcessor
  → fetch PR details, diff, files (GitHub API)
  → RAG retrieval (embedding similarity)
  → AgentOrchestrator (parallel agent execution)
  → CommentsService
  → POST PR summary comment + inline comments (GitHub API)
```

## Module Structure

```
src/
  agents/          # Specialized review agents
  orchestrator/    # Parallel agent coordination
  rag/             # Embedding + vector store + retrieval
  observability/   # Logging, metrics, tracing
  github/          # GitHub App API client
  review/          # BullMQ job processor
  webhooks/        # HTTP webhook handler
  comments/        # Comment formatting + posting
  queue/           # Queue configuration
  health/          # Health check endpoint
```
