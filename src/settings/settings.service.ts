import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

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
}
