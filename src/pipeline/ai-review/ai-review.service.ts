import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { z } from 'zod';
import { REVIEW_PROMPT } from '@/pipeline/prompts/review.prompt';

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
  private readonly genAI: GoogleGenerativeAI;

  constructor(private readonly config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(
      this.config.getOrThrow<string>('GOOGLE_API_KEY'),
    );
  }

  async reviewCode(diff: string): Promise<ReviewComment[]> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      systemInstruction: REVIEW_PROMPT,
    });
    const result = await model.generateContent(diff);
    const content = result.response.text() ?? '[]';

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
