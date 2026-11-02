import { Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { VectorService } from './vector.service';
import { RetrievalService } from './retrieval.service';

@Module({
  providers: [EmbeddingsService, VectorService, RetrievalService],
  exports: [RetrievalService],
})
export class RagModule {}
