import { Injectable, Logger } from '@nestjs/common';
import {
  GithubWebhookPayload,
  GithubPullRequestPayload,
  GithubInstallationPayload,
  GithubInstallationRepositoriesPayload,
  GithubIssuesPayload,
} from './webhooks.types';
import { PullRequestHandler } from './handlers/pull-request.handler';
import { InstallationHandler } from './handlers/installation.handler';
import { IssuesHandler } from './handlers/issues.handler';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly pullRequestHandler: PullRequestHandler,
    private readonly installationHandler: InstallationHandler,
    private readonly issuesHandler: IssuesHandler,
  ) {}

  handleGithubWebhook(
    payload: GithubWebhookPayload,
    headers: Record<string, string>,
    rawBody: string,
  ) {
    const event = headers['x-github-event'];
    const signature = headers['x-hub-signature-256'];

    this.logger.log(`EVENT: ${event}`);
    this.logger.log(`ACTION: ${payload.action}`);

    switch (event) {
      case 'pull_request':
        return this.pullRequestHandler.handle(
          event,
          payload as GithubPullRequestPayload,
          signature,
          rawBody,
        );

      case 'installation':
        return this.installationHandler.handle(
          event,
          payload as GithubInstallationPayload,
          signature,
          rawBody,
        );

      case 'installation_repositories':
        return this.installationHandler.handleRepositories(
          event,
          payload as GithubInstallationRepositoriesPayload,
          signature,
          rawBody,
        );

      case 'issues':
        return this.issuesHandler.handle(event, payload as GithubIssuesPayload);

      default:
        this.logger.warn(`Unknown event: ${event}`);
        return { received: true, event };
    }
  }
}
