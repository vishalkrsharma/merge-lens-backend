import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PullRequestHandler } from './handlers/pull-request.handler';
import { InstallationHandler } from './handlers/installation.handler';
import { IssuesHandler } from './handlers/issues.handler';
import { QueueModule } from '@/core/queue/queue.module';
import { RealtimeModule } from '@/core/realtime/realtime.module';

@Module({
  imports: [QueueModule, RealtimeModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    PullRequestHandler,
    InstallationHandler,
    IssuesHandler,
  ],
})
export class WebhooksModule {}
