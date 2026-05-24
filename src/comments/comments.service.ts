import { Injectable, Logger } from '@nestjs/common';
import { ReviewComment } from 'src/ai-review/ai-review.service';
import { GithubService } from 'src/github/github.service';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly githubService: GithubService) {}

  format(comment: ReviewComment): string {
    return `⚠️ ${comment.severity}\n\n${comment.comment}`;
  }

  async post(
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    filePath: string,
    comments: ReviewComment[],
  ) {
    for (const comment of comments) {
      try {
        await this.githubService.postReviewComment(
          owner,
          repo,
          pullNumber,
          commitId,
          filePath,
          comment.line,
          this.format(comment),
        );
      } catch {
        this.logger.warn(
          `Failed to post comment on ${filePath}:${comment.line}`,
        );
      }
    }
  }
}
