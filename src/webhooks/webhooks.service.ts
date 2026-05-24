import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { verifySignature } from 'src/github/verify-signature';
import { REVIEW_QUEUE, ReviewJobData } from 'src/queue/queue.constants';
import { GithubPullRequestPayload } from './webhooks.types';

@Injectable()
export class WebhooksService {
  constructor(
    @InjectQueue(REVIEW_QUEUE)
    private readonly reviewQueue: Queue<ReviewJobData>,
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

    await this.reviewQueue.add('review', {
      repo: payload.repository.name,
      owner: payload.repository.owner.login,
      pullNumber: payload.number,
    });

    return { queued: true };
  }
}
