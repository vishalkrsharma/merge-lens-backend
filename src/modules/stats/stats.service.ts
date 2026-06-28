import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: { repository: { userId } },
      include: { findings: true },
      orderBy: { createdAt: 'asc' },
    });

    const totalReviews = reviews.length;

    const findingsByAgent = { bug: 0, security: 0, performance: 0, style: 0 };
    const findingsBySeverity = { low: 0, medium: 0, high: 0 };

    for (const review of reviews) {
      for (const finding of review.findings) {
        findingsByAgent[finding.agent]++;
        findingsBySeverity[finding.severity]++;
      }
    }

    const totalFindings =
      findingsBySeverity.low +
      findingsBySeverity.medium +
      findingsBySeverity.high;

    const completedReviews = reviews.filter((r) => r.status === 'completed');
    const avgDurationMs =
      completedReviews.length > 0
        ? Math.round(
            completedReviews.reduce((acc, r) => acc + r.durationMs, 0) /
              completedReviews.length,
          )
        : 0;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthReviews = reviews.filter(
      (r) => r.createdAt >= startOfMonth,
    ).length;

    const reviewsOverTime = this.buildReviewsOverTime(reviews);

    return {
      totalReviews,
      totalFindings,
      findingsByAgent,
      findingsBySeverity,
      reviewsOverTime,
      avgDurationMs,
      thisMonthReviews,
    };
  }

  private buildReviewsOverTime(
    reviews: { createdAt: Date }[],
  ): { date: string; count: number }[] {
    const now = new Date();
    const result: { date: string; count: number }[] = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({ date: dateStr, count: 0 });
    }

    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 29);
    cutoff.setHours(0, 0, 0, 0);

    for (const review of reviews) {
      if (review.createdAt < cutoff) continue;
      const dateStr = review.createdAt.toISOString().slice(0, 10);
      const entry = result.find((r) => r.date === dateStr);
      if (entry) entry.count++;
    }

    return result;
  }
}
