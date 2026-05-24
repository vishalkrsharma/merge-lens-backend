import { Module } from '@nestjs/common';
import { ReviewProcessor } from './review.processor';
import { AiReviewModule } from 'src/ai-review/ai-review.module';
import { CommentsModule } from 'src/comments/comments.module';
import { GithubModule } from 'src/github/github.module';
import { QueueModule } from 'src/queue/queue.module';

@Module({
  imports: [QueueModule, GithubModule, AiReviewModule, CommentsModule],
  providers: [ReviewProcessor],
})
export class ReviewModule {}
