import { Controller, Post, Body, Headers } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { WebhooksService } from './webhooks.service';
import type { GithubWebhookPayload } from './webhooks.types';

@AllowAnonymous()
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post('github')
  async handleGithubWebhook(
    @Body() payload: GithubWebhookPayload,
    @Headers() headers: Record<string, string>,
  ) {
    return this.webhooksService.handleGithubWebhook(payload, headers);
  }
}
