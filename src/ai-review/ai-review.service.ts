import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { REVIEW_PROMPT } from 'src/prompt/review.prompt';

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
  private readonly groq: Groq;

  constructor(private readonly config: ConfigService) {
    this.groq = new Groq({
      apiKey: this.config.getOrThrow<string>('GROQ_API_KEY'),
    });
  }

  async reviewCode(diff: string): Promise<ReviewComment[]> {
    const completion = await this.groq.chat.completions.create({
      model: 'qwen/qwen3-32b',
      messages: [
        { role: 'system', content: REVIEW_PROMPT },
        { role: 'user', content: diff },
      ],
    });

    const content = completion.choices[0].message.content ?? '[]';

    this.logger.log(`AI review completed, got response: ${content}`);

    try {
      const cleaned = content.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      const parsed = JSON.parse(cleaned) as unknown;
      return reviewSchema.parse(parsed);
    } catch {
      this.logger.warn('AI returned invalid JSON, skipping file');
      return [];
    }
  }
}
