import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReviewContext } from '@/agents/types';
import { CommentsService } from '@/comments/comments.service';
import { GithubService } from '@/github/github.service';
import { LoggerService } from '@/observability/logger.service';
import { MetricsService } from '@/observability/metrics.service';
import { TracingService } from '@/observability/tracing.service';
import { OrchestratorService } from '@/orchestrator/orchestrator.service';
import { REVIEW_QUEUE, ReviewJobData } from '@/queue/queue.constants';
import { RetrievalService } from '@/rag/retrieval.service';

@Processor(REVIEW_QUEUE)
export class ReviewProcessor extends WorkerHost {
  private readonly logger = new Logger(ReviewProcessor.name);

  constructor(
    private readonly githubService: GithubService,
    private readonly orchestrator: OrchestratorService,
    private readonly commentsService: CommentsService,
    private readonly retrieval: RetrievalService,
    private readonly appLogger: LoggerService,
    private readonly metrics: MetricsService,
    private readonly tracing: TracingService,
  ) {
    super();
  }

  async process(job: Job<ReviewJobData>): Promise<void> {
    const { repo, owner, pullNumber } = job.data;
    const reviewStart = Date.now();
    const span = this.tracing.startSpan('review.process');

    this.appLogger.webhookReceived(owner, repo, pullNumber);
    this.logger.log(`Processing PR ${owner}/${repo}#${pullNumber}`);

    try {
      this.appLogger.fetchingPR(owner, repo, pullNumber);

      const [prDetails, commitId, files] = await Promise.all([
        this.githubService.getPRDetails(owner, repo, pullNumber),
        this.githubService.getHeadSha(owner, repo, pullNumber),
        this.githubService.getChangedFiles(owner, repo, pullNumber),
      ]);

      const diff = files
        .filter(
          (f): f is { filename: string; patch: string } =>
            typeof f.patch === 'string' && f.patch.length > 0,
        )
        .map((f) => `--- ${f.filename} ---\n${f.patch}`)
        .join('\n\n');

      if (!diff.trim()) {
        this.logger.warn(
          `PR ${owner}/${repo}#${pullNumber} has no diff, skipping`,
        );
        return;
      }

      const fileNames = files
        .map((f) =>
          typeof (f as { filename?: unknown })?.filename === 'string'
            ? (f as { filename: string }).filename
            : undefined,
        )
        .filter((n): n is string => typeof n === 'string');
      this.logger.log(`Fetched ${files.length} changed files`);

      const docs = await this.retrieval.retrieve(diff.slice(0, 2000));
      this.appLogger.ragRetrievalComplete(docs.length);

      const context: ReviewContext = {
        title: prDetails.title,
        description: prDetails.description,
        files: fileNames,
        diff,
        docs,
      };

      const result = await this.orchestrator.execute(context);

      this.appLogger.postingComments(owner, repo, pullNumber);
      await this.commentsService.postOrchestratorResults(
        owner,
        repo,
        pullNumber,
        commitId,
        result,
      );

      const duration = Date.now() - reviewStart;
      this.appLogger.reviewComplete(owner, repo, pullNumber, duration);
      this.metrics.recordReviewDuration(duration);

      const allFindings = [
        ...result.bug.findings,
        ...result.security.findings,
        ...result.performance.findings,
        ...result.style.findings,
      ];
      for (const finding of allFindings) {
        this.metrics.recordFindings('all', finding.severity, 1);
      }
    } catch (err) {
      this.appLogger.error(
        `ReviewProcessor(${owner}/${repo}#${pullNumber})`,
        err,
      );
      throw err;
    } finally {
      span.end();
    }
  }
}
