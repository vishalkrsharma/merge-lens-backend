import { Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { VectorService } from './vector.service';
import { RetrievalService } from './retrieval.service';
import { RepositoryIndexService } from './repository-index.service';

@Module({
  providers: [
    EmbeddingsService,
    VectorService,
    RetrievalService,
    RepositoryIndexService,
  ],
  exports: [RetrievalService],
})
export class RagModule {}
