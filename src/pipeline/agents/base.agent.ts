import { Logger } from '@nestjs/common';
import { ApiProvider } from '@/generated/prisma/enums';
import { LlmService } from '@/pipeline/llm/llm.service';
import { AgentResponse } from './types';

export abstract class BaseAgent {
  protected abstract readonly logger: Logger;

  constructor(protected readonly llm: LlmService) {}

  protected async generate(
    prompt: string,
    provider: ApiProvider,
    apiKey: string,
    modelId: string,
  ): Promise<AgentResponse> {
    const raw = await this.llm.generate(prompt, provider, apiKey, modelId);
    if (!raw) return { findings: [], summary: 'Agent failed to produce results' };

    try {
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
