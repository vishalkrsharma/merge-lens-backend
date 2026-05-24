import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';

interface VectorEntry {
  text: string;
  embedding: number[];
  source: string;
}

@Injectable()
export class VectorService {
  private readonly store: VectorEntry[] = [];

  constructor(private readonly embeddings: EmbeddingsService) {}

  async add(text: string, source: string): Promise<void> {
    const embedding = await this.embeddings.createEmbedding(text);
    this.store.push({ text, embedding, source });
  }

  async query(queryText: string, topK = 5): Promise<string[]> {
    if (this.store.length === 0) return [];

    const queryEmbedding = await this.embeddings.createEmbedding(queryText);

    const scored = this.store.map((entry) => ({
      text: entry.text,
      score: this.embeddings.cosineSimilarity(queryEmbedding, entry.embedding),
    }));

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, topK).map((s) => s.text);
  }

  get size(): number {
    return this.store.length;
  }
}
