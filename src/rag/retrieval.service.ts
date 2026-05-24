import { Injectable, Logger } from '@nestjs/common';
import { VectorService } from './vector.service';

@Injectable()
export class RetrievalService {
  private readonly logger = new Logger(RetrievalService.name);

  constructor(private readonly vectorService: VectorService) {}

  async retrieve(query: string, topK = 5): Promise<string[]> {
    if (this.vectorService.size === 0) {
      this.logger.warn('Vector store is empty, skipping retrieval');
      return [];
    }

    const start = Date.now();
    const results = await this.vectorService.query(query, topK);
    this.logger.log(
      `RAG retrieval completed in ${Date.now() - start}ms, got ${results.length} chunks`,
    );
    return results;
  }
}
