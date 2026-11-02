import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@/core/prisma/prisma.service';
import { VectorService } from './vector.service';

const DOCS_DIR = path.resolve(process.cwd(), 'docs');
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

@Injectable()
export class RepositoryIndexService implements OnModuleInit {
  private readonly logger = new Logger(RepositoryIndexService.name);
  private indexing = false;

  constructor(
    private readonly vectorService: VectorService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    // Build the index after Nest has completed startup; persisted embeddings are
    // loaded first, so the app can serve requests without waiting on Google.
    setImmediate(() => void this.indexDocuments());
  }

  async indexDocuments(): Promise<void> {
    if (this.indexing) return;
    this.indexing = true;

    try {
      if (!fs.existsSync(DOCS_DIR)) {
        this.logger.warn(
          `Docs directory not found at ${DOCS_DIR}, skipping indexing`,
        );
        return;
      }

      const files = fs
        .readdirSync(DOCS_DIR)
        .filter((file) => file.endsWith('.md'));
      const sources = new Set(files);
      const existing = await this.prisma.documentEmbedding.findMany();
      this.vectorService.removeSourcesNotIn(sources);

      const existingByKey = new Map<string, (typeof existing)[number]>();
      for (const entry of existing) {
        existingByKey.set(`${entry.source}:${entry.chunkIndex}`, entry);
      }

      for (const file of files) {
        const content = fs.readFileSync(path.join(DOCS_DIR, file), 'utf8');
        const chunks = this.chunkText(content);
        this.logger.log(`Indexing ${file}: ${chunks.length} chunks`);
        this.vectorService.clearSource(file);

        for (const [chunkIndex, text] of chunks.entries()) {
          const contentHash = this.hash(text);
          const cached = existingByKey.get(`${file}:${chunkIndex}`);
          if (cached?.contentHash === contentHash) {
            this.vectorService.addStored(
              text,
              cached.embedding as number[],
              file,
            );
            continue;
          }

          try {
            const embedding = await this.vectorService.embed(text, file);
            await this.prisma.documentEmbedding.upsert({
              where: { source_chunkIndex: { source: file, chunkIndex } },
              create: {
                source: file,
                chunkIndex,
                contentHash,
                text,
                embedding,
              },
              update: { contentHash, text, embedding },
            });
          } catch (err) {
            this.logger.warn(
              `Failed to embed chunk from ${file}: ${String(err)}`,
            );
          }
        }

        await this.prisma.documentEmbedding.deleteMany({
          where: { source: file, chunkIndex: { gte: chunks.length } },
        });
      }

      await this.prisma.documentEmbedding.deleteMany({
        where: { source: { notIn: files.length ? files : [''] } },
      });

      this.logger.log(
        `Repository index complete. ${this.vectorService.size} chunks stored`,
      );
    } catch (err) {
      this.logger.error(`Repository indexing failed: ${String(err)}`);
    } finally {
      this.indexing = false;
    }
  }

  private hash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  private chunkText(text: string): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
      const chunk = words.slice(i, i + CHUNK_SIZE).join(' ');
      if (chunk.trim().length > 0) chunks.push(chunk);
    }

    return chunks;
  }
}
