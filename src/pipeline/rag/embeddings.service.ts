import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class EmbeddingsService {
  private readonly logger = new Logger(EmbeddingsService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(config.getOrThrow('GOOGLE_API_KEY'));
  }

  async createEmbedding(text: string): Promise<number[]> {
    const truncated = text.slice(0, 8000);
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-embedding-2',
    });
    const result = await model.embedContent(truncated);
    const embedding = result.embedding.values;
    if (!Array.isArray(embedding)) {
      throw new Error('Embedding response is not an array');
    }
    return embedding;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
