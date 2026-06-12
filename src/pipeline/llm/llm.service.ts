import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { ApiProvider } from '@/generated/prisma/enums';

const MODELS: Record<ApiProvider, string> = {
  [ApiProvider.google]: 'gemini-2.0-flash',
  [ApiProvider.anthropic]: 'claude-haiku-4-5-20251001',
  [ApiProvider.openai]: 'gpt-4o-mini',
  [ApiProvider.voyage]: '',
};

@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: ConfigService) {}

  async generate(prompt: string, provider: ApiProvider, apiKey: string): Promise<string> {
    try {
      switch (provider) {
        case ApiProvider.google:
          return await this.generateGoogle(prompt, apiKey);
        case ApiProvider.anthropic:
          return await this.generateAnthropic(prompt, apiKey);
        case ApiProvider.openai:
          return await this.generateOpenAI(prompt, apiKey);
        default:
          this.logger.warn(`Unsupported provider ${String(provider)}, falling back to google`);
          return await this.generateGoogle(
            prompt,
            this.config.getOrThrow<string>('GOOGLE_API_KEY'),
          );
      }
    } catch (err) {
      this.logger.warn(`LLM generate failed (${String(provider)}): ${String(err)}`);
      return '';
    }
  }

  private async generateGoogle(prompt: string, apiKey: string): Promise<string> {
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: MODELS[ApiProvider.google] });
    const result = await model.generateContent(prompt);
    return result.response.text() ?? '';
  }

  private async generateAnthropic(prompt: string, apiKey: string): Promise<string> {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODELS[ApiProvider.anthropic],
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const block = message.content[0];
    return block?.type === 'text' ? block.text : '';
  }

  private async generateOpenAI(prompt: string, apiKey: string): Promise<string> {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: MODELS[ApiProvider.openai],
      messages: [{ role: 'user', content: prompt }],
    });
    return completion.choices[0]?.message.content ?? '';
  }
}
