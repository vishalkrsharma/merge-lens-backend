import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AiReviewService } from 'src/ai-review/ai-review.service';
import { CommentsService } from 'src/comments/comments.service';
import { GithubService } from 'src/github/github.service';
import { REVIEW_QUEUE, ReviewJobData } from 'src/queue/queue.constants';

@Processor(REVIEW_QUEUE)
export class ReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewProcessor.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly aiReviewService: AiReviewService,
    private readonly commentsService: CommentsService,
  ) {
    super();
  }

  async process(job: Job<ReviewJobData>): Promise<void> {
    const { repo, owner, pullNumber } = job.data;
    this.logger.log(`Reviewing PR ${owner}/${repo}#${pullNumber}`);

    const commitId = await this.githubService.getHeadSha(
      owner,
      repo,
      pullNumber,
    );
    const files = await this.githubService.getChangedFiles(
      owner,
      repo,
      pullNumber,
    );

    for (const file of files) {
      if (!file.patch) continue;

      this.logger.log(`Reviewing ${file.filename}`);

      const comments = await this.aiReviewService.reviewCode(file.patch);

      await this.commentsService.post(
        owner,
        repo,
        pullNumber,
        commitId,
        file.filename,
        comments,
      );
    }

    this.logger.log(`Done reviewing PR ${owner}/${repo}#${pullNumber}`);
  }
}
