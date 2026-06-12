import { Module } from '@nestjs/common';
import { ReviewProcessor } from './review.processor';
import { CommentsModule } from '@/integrations/comments/comments.module';
import { GithubModule } from '@/integrations/github/github.module';
import { ObservabilityModule } from '@/core/observability/observability.module';
import { OrchestratorModule } from '@/pipeline/orchestrator/orchestrator.module';
import { QueueModule } from '@/core/queue/queue.module';
import { RagModule } from '@/pipeline/rag/rag.module';
import { SettingsModule } from '@/modules/settings/settings.module';

@Module({
  imports: [
    QueueModule,
    GithubModule,
    CommentsModule,
    OrchestratorModule,
    RagModule,
    ObservabilityModule,
    SettingsModule,
  ],
  providers: [ReviewProcessor],
})
export class ReviewModule {}
