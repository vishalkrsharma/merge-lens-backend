import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { REVIEW_PROMPT } from '@/prompt/review.prompt';

const reviewSchema = z.array(
  z.object({
    file: z.string(),
    line: z.number(),
    severity: z.string(),
    comment: z.string(),
  }),
);

export type ReviewComment = z.infer<typeof reviewSchema>[number];

@Injectable()
export class AiReviewService {
  private readonly logger = new Logger(AiReviewService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  async reviewCode(diff: string): Promise<ReviewComment[]> {
    const message = await this.anthropic.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 16000,
      system: [
        {
          type: 'text',
          text: REVIEW_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
      ],
      messages: [{ role: 'user', content: diff }],
    });

    const textBlock = message.content.find((b) => b.type === 'text');
    const content = textBlock?.text ?? '[]';

    this.logger.log(`AI review completed, got response: ${content}`);

    try {
      const parsed = JSON.parse(content) as unknown;
      return reviewSchema.parse(parsed);
    } catch {
      this.logger.warn('AI returned invalid JSON, skipping file');
      return [];
    }
  }
}
