import fs from 'fs';
import path from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { VectorService } from './vector.service';

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

@Injectable()
export class RepositoryIndexService implements OnModuleInit {
  private readonly logger = new Logger(RepositoryIndexService.name);

  constructor(private readonly vectorService: VectorService) {}

  async onModuleInit(): Promise<void> {
    if (!fs.existsSync(DOCS_DIR)) {
      this.logger.warn(
        `Docs directory not found at ${DOCS_DIR}, skipping indexing`,
      );
      return;
    }

    const files = fs.readdirSync(DOCS_DIR).filter((f) => f.endsWith('.md'));
    if (files.length === 0) {
      this.logger.warn('No markdown docs found to index');
      return;
    }

    this.logger.log(`Indexing ${files.length} docs from ${DOCS_DIR}`);

    for (const file of files) {
      const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
      const chunks = this.chunkText(content);
      this.logger.log(`Indexing ${file}: ${chunks.length} chunks`);

      for (const chunk of chunks) {
        try {
          await this.vectorService.add(chunk, file);
        } catch (err) {
          this.logger.warn(
            `Failed to embed chunk from ${file}: ${String(err)}`,
          );
        }
      }
    }

    this.logger.log(
      `Repository index complete. ${this.vectorService.size} chunks stored`,
    );
  }

  private chunkText(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
      if (chunk.trim().length > 0) {
        chunks.push(chunk);
      }
    }

    return chunks;
  }
}
