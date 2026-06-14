FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# ── Build stage ──────────────────────────────────────────────────────────────
FROM base AS builder
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ── Production stage ──────────────────────────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Copy compiled output and Prisma artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/generated ./src/generated
COPY prisma ./prisma
COPY prisma.config.ts ./

EXPOSE 8080

CMD ["node", "dist/src/main"]
