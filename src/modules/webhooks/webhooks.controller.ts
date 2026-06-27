import { Controller, Post, Body, Headers, Req } from '@nestjs/common';
import { Request } from 'express';
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
    @Req() req: Request & { rawBody?: string },
  ) {
    return this.webhooksService.handleGithubWebhook(payload, headers, req.rawBody ?? '');
  }
}
