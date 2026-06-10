import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { verifySignature } from '@/integrations/github/verify-signature';
import { PrismaService } from '@/core/prisma/prisma.service';
import { REVIEW_QUEUE, ReviewJobData } from '@/core/queue/queue.constants';
import { GithubPullRequestPayload } from '../webhooks.types';

@Injectable()
export class PullRequestHandler {
  private readonly logger = new Logger(PullRequestHandler.name);

  constructor(
    @InjectQueue(REVIEW_QUEUE)
    private readonly reviewQueue: Queue<ReviewJobData>,
    private readonly prisma: PrismaService,
  ) {}

  handle(event: string, payload: GithubPullRequestPayload, signature: string) {
    switch (payload.action) {
      case 'opened':
      case 'synchronize':
      case 'reopened':
        return this.handleReviewable(payload, signature);

      case 'closed':
      case 'assigned':
      case 'unassigned':
      case 'review_requested':
      case 'review_request_removed':
      case 'labeled':
      case 'unlabeled':
      case 'converted_to_draft':
      case 'ready_for_review':
      case 'locked':
      case 'unlocked':
      case 'milestoned':
      case 'demilestoned':
      case 'edited':
      case 'dequeued':
      case 'enqueued':
        this.logger.log(`Unhandled action: ${event}.${payload.action}`);
        return { received: true, event, action: payload.action };

      default:
        this.logger.warn(`Unknown action: ${event}.${payload.action}`);
        return { received: true, event, action: payload.action };
    }
  }

  private async handleReviewable(
    payload: GithubPullRequestPayload,
    signature: string,
  ) {
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

    if (!repository.isActive) {
      this.logger.log(`Reviews disabled for ${owner}/${repo}, skipping`);
      return { skipped: true, reason: 'reviews disabled' };
    }

    await this.reviewQueue.add('review', {
      repo,
      owner,
      pullNumber: payload.number,
      repositoryId: repository.id,
      installationId: repository.installationId,
      enabledAgents: repository.enabledAgents,
      severityThreshold: repository.severityThreshold,
    });

    return { queued: true };
  }
}
