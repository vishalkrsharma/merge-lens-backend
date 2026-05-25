import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AgentResponse } from './types';

export abstract class BaseAgent {
  protected abstract readonly logger: Logger;
  protected readonly anthropic: Anthropic;

  constructor(config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: config.getOrThrow('ANTHROPIC_API_KEY'),
    });
  }

  protected async generate(prompt: string): Promise<AgentResponse> {
    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 16000,
        thinking: { type: 'adaptive' },
        messages: [{ role: 'user', content: prompt }],
      });

      const textBlock = message.content.find((b) => b.type === 'text');
      const raw = textBlock?.text ?? '{"findings":[],"summary":""}';
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
