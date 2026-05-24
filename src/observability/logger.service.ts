import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class LoggerService {
  private readonly logger = new Logger('MergeLens');

  webhookReceived(owner: string, repo: string, prNumber: number) {
    this.logger.log(`Webhook received: ${owner}/${repo}#${prNumber}`);
  }

  fetchingPR(owner: string, repo: string, prNumber: number) {
    this.logger.log(`Fetching PR: ${owner}/${repo}#${prNumber}`);
  }

  agentStarting(name: string) {
    this.logger.log(`${name} agent starting`);
  }

  ragRetrievalComplete(chunks: number) {
    this.logger.log(`RAG retrieval completed: ${chunks} chunks`);
  }

  postingComments(owner: string, repo: string, prNumber: number) {
    this.logger.log(`Posting comments to ${owner}/${repo}#${prNumber}`);
  }

  reviewComplete(
    owner: string,
    repo: string,
    prNumber: number,
    durationMs: number,
  ) {
    this.logger.log(
      `Review complete for ${owner}/${repo}#${prNumber} in ${durationMs}ms`,
    );
  }

  error(context: string, err: unknown) {
    this.logger.error(`[${context}] ${String(err)}`);
  }
}
