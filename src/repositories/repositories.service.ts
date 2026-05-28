import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AgentType, Severity } from '@/generated/prisma/enums';

interface UpdateRepositoryDto {
  enabledAgents?: AgentType[];
  severityThreshold?: Severity;
}

@Injectable()
export class RepositoriesService {
  constructor(private readonly prisma: PrismaService) {}

  listRepositories(userId: string) {
    return this.prisma.repository.findMany({
      where: { userId },
      orderBy: { installedAt: 'desc' },
    });
  }

  async updateRepository(id: string, userId: string, dto: UpdateRepositoryDto) {
    const existing = await this.prisma.repository.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Repository not found');
    }

    return this.prisma.repository.update({
      where: { id },
      data: dto,
    });
  }
}
