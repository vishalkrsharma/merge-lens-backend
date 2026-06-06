import {
  BadGatewayException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import {
  GithubRepo,
  GithubService,
} from '@/integrations/github/github.service';
import { AgentType, Severity } from '@/generated/prisma/enums';

interface UpdateRepositoryDto {
  enabledAgents?: AgentType[];
  severityThreshold?: Severity;
}

@Injectable()
export class RepositoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GithubService,
  ) {}

  listRepositories(userId: string) {
    return this.prisma.repository.findMany({
      where: { userId },
      orderBy: { installedAt: 'desc' },
    });
  }

  async listAvailableRepositories(userId: string) {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: 'github' },
      select: { accessToken: true },
    });

    if (!account?.accessToken) {
      throw new NotFoundException('GitHub account not linked');
    }

    let githubRepos: GithubRepo[];
    try {
      githubRepos = await this.github.listUserRepos(account.accessToken);
    } catch (err: any) {
      this.throwGithubError(err);
    }

    const existingRepos = await this.prisma.repository.findMany({
      where: { userId },
      select: { owner: true, repo: true },
    });

    const existingSet = new Set(
      existingRepos.map((r) => `${r.owner}/${r.repo}`),
    );
    return githubRepos.filter((r) => !existingSet.has(r.fullName));
  }

  async addRepository(userId: string, repoId: number, fullName: string) {
    const account = await this.prisma.account.findFirst({
      where: { userId, providerId: 'github' },
      select: { accessToken: true },
    });

    if (!account?.accessToken) {
      throw new NotFoundException('GitHub account not linked');
    }

    const existingRepo = await this.prisma.repository.findFirst({
      where: { userId },
      select: { installationId: true },
    });

    let installationId = existingRepo?.installationId ?? null;

    if (!installationId) {
      installationId = await this.github.getAppInstallationId(
        account.accessToken,
      );
    }

    if (!installationId) {
      throw new NotFoundException('GitHub App installation not found');
    }

    const [owner, repo] = fullName.split('/');

    // Attempt to add repo to the installation (selected-repos mode).
    // 422 means the installation is in all-repos mode — repo already accessible.
    try {
      await this.github.addRepoToInstallation(
        account.accessToken,
        installationId,
        repoId,
      );
    } catch (err: any) {
      if (err?.status !== 422) {
        this.throwGithubError(err);
      }
    }

    // Confirm the repo is now in the installation's accessible list.
    // repos.get() is not sufficient — it returns 200 for any public repo
    // even when it is not explicitly granted to the installation.
    let installationRepos: { owner: string; repo: string }[];
    try {
      installationRepos =
        await this.github.listInstallationRepos(installationId);
    } catch (err: any) {
      this.throwGithubError(err);
    }

    const isAccessible = installationRepos.some(
      (r) => r.owner === owner && r.repo === repo,
    );

    if (!isAccessible) {
      throw new NotFoundException(
        'Repository is not accessible via the GitHub App installation. ' +
          'Open GitHub App settings and add this repository first.',
      );
    }

    return this.prisma.repository.upsert({
      where: { owner_repo_userId: { owner, repo, userId } },
      create: { owner, repo, installationId, userId, enabledAgents: [] },
      update: { installationId },
    });
  }

  private throwGithubError(err: any): never {
    const status = err?.status ?? err?.response?.status;
    if (status === 401 || status === 403) {
      throw new UnauthorizedException(
        'GitHub token lacks required permissions — please re-login',
      );
    }
    if (status === 404) {
      throw new NotFoundException('Repository not found on GitHub');
    }
    throw new BadGatewayException(
      `GitHub API error: ${err?.message ?? 'unknown'}`,
    );
  }

  async syncRepositories(userId: string) {
    const existingRepo = await this.prisma.repository.findFirst({
      where: { userId },
      select: { installationId: true },
    });

    if (!existingRepo?.installationId) {
      throw new NotFoundException('GitHub App installation not found');
    }

    const { installationId } = existingRepo;

    let installationRepos: { owner: string; repo: string }[];
    try {
      installationRepos =
        await this.github.listInstallationRepos(installationId);
    } catch (err: any) {
      this.throwGithubError(err);
    }

    const accessibleSet = new Set(
      installationRepos.map((r) => `${r.owner}/${r.repo}`),
    );

    const dbRepos = await this.prisma.repository.findMany({
      where: { userId, installationId },
      select: { id: true, owner: true, repo: true },
    });

    const toRemove = dbRepos.filter(
      (r) => !accessibleSet.has(`${r.owner}/${r.repo}`),
    );

    if (toRemove.length > 0) {
      await this.prisma.repository.deleteMany({
        where: { id: { in: toRemove.map((r) => r.id) } },
      });
    }

    return {
      synced: true,
      removed: toRemove.map((r) => `${r.owner}/${r.repo}`),
      accessible: installationRepos.length,
    };
  }

  async deleteRepository(id: string, userId: string) {
    const existing = await this.prisma.repository.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException('Repository not found');
    }

    return this.prisma.repository.delete({ where: { id } });
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
