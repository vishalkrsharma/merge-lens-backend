import { Module } from '@nestjs/common';
import { ReviewProcessor } from './review.processor';
import { CommentsModule } from '@/comments/comments.module';
import { GithubModule } from '@/github/github.module';
import { ObservabilityModule } from '@/observability/observability.module';
import { OrchestratorModule } from '@/orchestrator/orchestrator.module';
import { QueueModule } from '@/queue/queue.module';
import { RagModule } from '@/rag/rag.module';

@Module({
  imports: [
    QueueModule,
    GithubModule,
    CommentsModule,
    OrchestratorModule,
    RagModule,
    ObservabilityModule,
  ],
  providers: [ReviewProcessor],
})
export class ReviewModule {}
