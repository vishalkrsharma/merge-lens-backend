import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ReviewStatus } from '@/generated/prisma/enums';

interface ListReviewsOptions {
  userId: string;
  q?: string;
  repo?: string;
  status?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async listReviews({ userId, q, repo, status, page = 1, limit = 20 }: ListReviewsOptions) {
    const where: Record<string, unknown> = { repository: { userId } };

    if (q) {
      where.prTitle = { contains: q, mode: 'insensitive' };
    }

    if (repo && repo !== 'all') {
      const [owner, repoName] = repo.split('/');
      where.owner = owner;
      where.repo = repoName;
    }

    if (status && status !== 'all') {
      where.status = status as ReviewStatus;
    }

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: { findings: { select: { severity: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);

    const data = reviews.map((review) => {
      const findingCounts = { high: 0, medium: 0, low: 0 };
      for (const f of review.findings) {
        findingCounts[f.severity]++;
      }
      const { findings: _, ...rest } = review;
      return { ...rest, findingCounts };
    });

    return { data, total };
  }

  async getReview(id: string, userId: string) {
    const review = await this.prisma.review.findFirst({
      where: { id, repository: { userId } },
      include: {
        findings: true,
        summary: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }
}
