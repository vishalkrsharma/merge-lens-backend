# Style Guide

## TypeScript

- Use strict TypeScript. Enable `strictNullChecks`, `noImplicitAny`.
- Prefer `const` over `let`. Never use `var`.
- Use explicit return types on all public methods.
- Prefer `async/await` over raw Promises.
- Always handle errors: catch exceptions or propagate them explicitly.
- Avoid `any` type — use `unknown` and narrow it instead.

## NestJS Conventions

- One module per feature directory.
- Services are `@Injectable()` singletons.
- Controllers only handle HTTP concerns (validation, parsing, status codes).
- Business logic lives in services, never in controllers.
- Use `ConfigService` for all environment variable access — never `process.env` directly.
- Use `Logger` from `@nestjs/common` with the class name as context.

## Naming

- Files: `kebab-case.ts` (e.g., `review.processor.ts`)
- Classes: `PascalCase`
- Methods and variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` without `I` prefix

## Error Handling

- Log warnings for recoverable errors (e.g., failed individual comments).
- Throw and let the BullMQ processor retry for job-level failures.
- Never swallow errors silently — always log or rethrow.

## Testing

- Unit tests live next to source files: `*.spec.ts`
- Integration tests in `test/` directory
- Mock external dependencies (Groq, GitHub API) in unit tests
- Use real Redis/GitHub in integration tests
