import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { verifySignature } from '@/github/verify-signature';
import { PrismaService } from '@/prisma/prisma.service';
import { REVIEW_QUEUE, ReviewJobData } from '@/queue/queue.constants';
import { GithubPullRequestPayload } from './webhooks.types';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    @InjectQueue(REVIEW_QUEUE)
    private readonly reviewQueue: Queue<ReviewJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async handleGithubWebhook(
    payload: GithubPullRequestPayload,
    headers: Record<string, string>,
  ) {
    const signature = headers['x-hub-signature-256'];

    if (!['opened', 'synchronize', 'reopened'].includes(payload.action)) {
      return { ignored: true };
    }

    if (!verifySignature(JSON.stringify(payload), signature)) {
      return { invalidSignature: true };
    }

    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;

    const repository = await this.prisma.repository.findFirst({
      where: {
        owner,
        repo,
        ...(payload.installation?.id
          ? { installationId: payload.installation.id }
          : {}),
      },
    });

    if (!repository) {
      this.logger.warn(
        `Repository ${owner}/${repo} not found in database, skipping webhook`,
      );
      return { skipped: true, reason: 'repository not registered' };
    }

    await this.reviewQueue.add('review', {
      repo,
      owner,
      pullNumber: payload.number,
      repositoryId: repository.id,
    });

    return { queued: true };
  }
}
