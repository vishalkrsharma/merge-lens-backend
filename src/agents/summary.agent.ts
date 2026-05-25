import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AgentResponse, ReviewContext } from './types';

@Injectable()
export class SummaryAgent {
  private readonly logger = new Logger(SummaryAgent.name);
  private readonly anthropic: Anthropic;

  constructor(config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: config.getOrThrow('ANTHROPIC_API_KEY'),
    });
  }

  async summarize(
    context: ReviewContext,
    results: {
      bug: AgentResponse;
      security: AgentResponse;
      performance: AgentResponse;
      style: AgentResponse;
    },
  ): Promise<string> {
    const totalFindings =
      results.bug.findings.length +
      results.security.findings.length +
      results.performance.findings.length +
      results.style.findings.length;

    const highFindings = [
      ...results.bug.findings,
      ...results.security.findings,
      ...results.performance.findings,
      ...results.style.findings,
    ].filter((f) => f.severity === 'high').length;

    const prompt = `You are a senior engineering manager summarizing a PR review.

PR: ${context.title}
Description: ${context.description}

Agent summaries:
- Bug Analysis: ${results.bug.summary}
- Security Analysis: ${results.security.summary}
- Performance Analysis: ${results.performance.summary}
- Style Analysis: ${results.style.summary}

Total findings: ${totalFindings} (${highFindings} high severity)

Write a concise 3-4 sentence overall PR review summary covering:
1. Overall quality and risk level (Low/Medium/High)
2. Most critical issues to address
3. Positive aspects if any
4. Merge recommendation

Return plain text only, no JSON, no markdown headers.`;

    try {
      const message = await this.anthropic.messages.create({
        model: 'claude-opus-4-7',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      });
      const textBlock = message.content.find((b) => b.type === 'text');
      return textBlock?.text.trim() ?? '';
    } catch (err) {
      this.logger.warn(`SummaryAgent failed: ${String(err)}`);
      return `PR review complete. Found ${totalFindings} issues (${highFindings} high severity).`;
    }
  }
}
