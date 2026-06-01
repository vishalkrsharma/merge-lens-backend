import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { AgentType, Severity } from '@/generated/prisma/enums';

interface ListFindingsOptions {
  userId: string;
  agent?: string;
  severity?: string;
  repo?: string;
  file?: string;
  page?: number;
  limit?: number;
}

@Injectable()
export class FindingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listFindings({
    userId,
    agent,
    severity,
    repo,
    file,
    page = 1,
    limit = 20,
  }: ListFindingsOptions) {
    const reviewWhere: Record<string, unknown> = { repository: { userId } };

    if (repo && repo !== 'all') {
      const [owner, repoName] = repo.split('/');
      reviewWhere.owner = owner;
      reviewWhere.repo = repoName;
    }

    const where: Record<string, unknown> = { review: reviewWhere };

    if (agent && agent !== 'all') {
      where.agent = agent as AgentType;
    }

    if (severity && severity !== 'all') {
      where.severity = severity as Severity;
    }

    if (file) {
      where.file = { contains: file, mode: 'insensitive' };
    }

    const [findings, total] = await Promise.all([
      this.prisma.finding.findMany({
        where,
        include: {
          review: { select: { id: true, owner: true, repo: true } },
        },
        orderBy: [{ severity: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.finding.count({ where }),
    ]);

    return { data: findings, total };
  }

  async getHotspots(userId: string, limit = 5) {
    const findings = await this.prisma.finding.findMany({
      where: { review: { repository: { userId } } },
      select: { file: true },
    });

    const counts = new Map<string, number>();
    for (const f of findings) {
      counts.set(f.file, (counts.get(f.file) ?? 0) + 1);
    }

    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([file, count]) => ({ file, count }));
  }
}
