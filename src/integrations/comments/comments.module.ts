import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { GithubModule } from '@/integrations/github/github.module';

@Module({
  imports: [GithubModule],
  providers: [CommentsService],
  exports: [CommentsService],
})
export class CommentsModule {}
