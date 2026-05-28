import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { QueueModule } from './queue/queue.module';
import { ReviewModule } from './review/review.module';
import { GithubModule } from './github/github.module';
import { AiReviewModule } from './ai-review/ai-review.module';
import { CommentsModule } from './comments/comments.module';
import { AgentsModule } from './agents/agents.module';
import { OrchestratorModule } from './orchestrator/orchestrator.module';
import { RagModule } from './rag/rag.module';
import { ObservabilityModule } from './observability/observability.module';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from './lib/auth';
import { PrismaModule } from '@/prisma/prisma.module';
import { StatsModule } from './stats/stats.module';
import { ReviewsModule } from './reviews/reviews.module';
import { FindingsModule } from './findings/findings.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.getOrThrow<string>('REDIS_URL') },
      }),
    }),
    LoggerModule.forRoot({
      pinoHttp: {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, singleLine: true },
        },
      },
    }),
    PrismaModule,
    AuthModule.forRoot({ auth }),
    HealthModule,
    WebhooksModule,
    QueueModule,
    GithubModule,
    AiReviewModule,
    CommentsModule,
    AgentsModule,
    OrchestratorModule,
    RagModule,
    ObservabilityModule,
    ReviewModule,
    StatsModule,
    ReviewsModule,
    FindingsModule,
    RepositoriesModule,
    SettingsModule,
  ],
})
export class AppModule {}
