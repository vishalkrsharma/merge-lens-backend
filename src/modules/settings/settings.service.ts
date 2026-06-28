import { Injectable } from '@nestjs/common';
import { ApiProvider } from '@/generated/prisma/enums';
import { PrismaService } from '@/core/prisma/prisma.service';
import { MODEL_CATALOG, ModelEntry, findModel } from '@/pipeline/llm/model-catalog';

export type ReviewProvider = typeof REVIEW_PROVIDERS[number];
export const REVIEW_PROVIDERS = [ApiProvider.google, ApiProvider.anthropic, ApiProvider.openai] as const;

const MONTHLY_LIMIT = 50;

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUsage(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [thisMonthReviews, apiLogs] = await Promise.all([
      this.prisma.review.count({
        where: {
          repository: { userId },
          createdAt: { gte: startOfMonth },
        },
      }),
      this.prisma.apiUsageLog.findMany({
        where: {
          review: { repository: { userId } },
          createdAt: { gte: startOfMonth },
        },
        select: {
          provider: true,
          calls: true,
          inputTokens: true,
          outputTokens: true,
          costCents: true,
        },
      }),
    ]);

    const providerMap = new Map<
      string,
      { calls: number; inputTokens: number; outputTokens: number; costCents: number }
    >();

    for (const log of apiLogs) {
      const existing = providerMap.get(log.provider) ?? {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        costCents: 0,
      };
      existing.calls += log.calls;
      existing.inputTokens += log.inputTokens;
      existing.outputTokens += log.outputTokens;
      existing.costCents += log.costCents;
      providerMap.set(log.provider, existing);
    }

    const apiUsage = Array.from(providerMap.entries()).map(([provider, stats]) => ({
      provider,
      ...stats,
    }));

    return { thisMonthReviews, monthlyLimit: MONTHLY_LIMIT, apiUsage };
  }

  async getPreferredProvider(userId: string): Promise<ReviewProvider | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredProvider: true },
    });
    const p = user?.preferredProvider;
    return (p && (REVIEW_PROVIDERS as readonly ApiProvider[]).includes(p) ? p : null) as ReviewProvider | null;
  }

  async setPreferredProvider(userId: string, provider: ReviewProvider | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { preferredProvider: provider ?? null },
    });
  }

  getModels(): ModelEntry[] {
    return MODEL_CATALOG;
  }

  async getPreferredModel(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { preferredModel: true },
    });
    const m = user?.preferredModel;
    return (m && findModel(m)) ? m : null;
  }

  async setPreferredModel(userId: string, modelId: string | null, provider?: ApiProvider | null): Promise<void> {
    const catalogEntry = modelId ? findModel(modelId) : null;
    const resolvedProvider = provider ?? catalogEntry?.provider ?? null;
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        preferredModel: modelId ?? null,
        // Keep preferredProvider in sync so the orchestrator knows which SDK to use
        preferredProvider: resolvedProvider,
      },
    });
  }

  async getOllamaUrl(userId: string): Promise<string | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { ollamaBaseUrl: true },
    });
    return user?.ollamaBaseUrl ?? null;
  }

  async setOllamaUrl(userId: string, url: string | null): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { ollamaBaseUrl: url ?? null },
    });
  }

  async getOllamaModels(userId: string): Promise<{ models: string[]; error?: string }> {
    const url = await this.getOllamaUrl(userId);
    const baseUrl = (url?.trim() || process.env.OLLAMA_BASE_URL || 'http://localhost:11434').replace(/\/$/, '');
    try {
      const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return { models: [], error: `Ollama returned ${res.status}` };
      const data = await res.json() as { models: Array<{ name: string }> };
      return { models: (data.models ?? []).map((m) => m.name) };
    } catch {
      return { models: [], error: `Cannot reach Ollama at ${baseUrl}` };
    }
  }
}
