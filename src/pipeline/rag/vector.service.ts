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

  addStored(text: string, embedding: number[], source: string): void {
    this.store.push({ text, embedding, source });
  }

  async embed(text: string, source: string): Promise<number[]> {
    const embedding = await this.embeddings.createEmbedding(text);
    this.addStored(text, embedding, source);
    return embedding;
  }

  clearSource(source: string): void {
    for (let i = this.store.length - 1; i >= 0; i--) {
      if (this.store[i].source === source) this.store.splice(i, 1);
    }
  }

  removeSourcesNotIn(sources: Set<string>): void {
    for (let i = this.store.length - 1; i >= 0; i--) {
      if (!sources.has(this.store[i].source)) this.store.splice(i, 1);
    }
  }

  async add(text: string, source: string): Promise<void> {
    await this.embed(text, source);
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
