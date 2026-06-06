import { Injectable, Logger } from '@nestjs/common';
import { GithubIssuesPayload } from '../webhooks.types';

@Injectable()
export class IssuesHandler {
  private readonly logger = new Logger(IssuesHandler.name);

  handle(event: string, payload: GithubIssuesPayload) {
    switch (payload.action) {
      case 'opened':
      case 'edited':
      case 'closed':
      case 'reopened':
      case 'assigned':
      case 'unassigned':
      case 'labeled':
      case 'unlabeled':
      case 'locked':
      case 'unlocked':
      case 'milestoned':
      case 'demilestoned':
      case 'deleted':
      case 'transferred':
      case 'pinned':
      case 'unpinned':
        this.logger.log(`Unhandled action: ${event}.${payload.action}`);
        return { received: true, event, action: payload.action };

      default:
        this.logger.warn(`Unknown action: ${event}.${payload.action}`);
        return { received: true, event, action: payload.action };
    }
  }
}
