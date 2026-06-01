import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AgentResponse } from './types';

export abstract class BaseAgent {
  protected abstract readonly logger: Logger;
  protected readonly genAI: GoogleGenerativeAI;

  constructor(config: ConfigService) {
    this.genAI = new GoogleGenerativeAI(config.getOrThrow('GOOGLE_API_KEY'));
  }

  protected async generate(prompt: string): Promise<AgentResponse> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
      });
      const result = await model.generateContent(prompt);

      const raw = result.response.text() ?? '{"findings":[],"summary":""}';
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : raw;

      return JSON.parse(jsonStr) as AgentResponse;
    } catch (err) {
      this.logger.warn(`Agent failed to parse response: ${String(err)}`);
      return { findings: [], summary: 'Agent failed to produce results' };
    }
  }

  protected buildDocsSection(docs: string[]): string {
    if (docs.length === 0) return '';
    return `Repository Context:\n${docs.join('\n\n')}\n\n`;
  }
}
