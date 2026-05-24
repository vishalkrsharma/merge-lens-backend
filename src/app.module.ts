import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { HealthModule } from './health/health.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QueueModule } from './queue/queue.module';
import { ReviewModule } from './review/review.module';
import { GithubModule } from './github/github.module';
import { AiReviewModule } from './ai-review/ai-review.module';
import { CommentsModule } from './comments/comments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    HealthModule,
    WebhooksModule,
    QueueModule,
    GithubModule,
    ReviewModule,
    AiReviewModule,
    CommentsModule,
  ],
})
export class AppModule {}
