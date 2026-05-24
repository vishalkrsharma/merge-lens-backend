import { Controller, Post, Body, Headers } from '@nestjs/common';
import { WebhooksService } from './webhooks.service';
import type { GithubPullRequestPayload } from './webhooks.types';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  async handleGithubWebhook(
    @Body() payload: GithubPullRequestPayload,
    @Headers() headers: Record<string, string>,
  ) {
    return this.webhooksService.handleGithubWebhook(payload, headers);
  }
}
