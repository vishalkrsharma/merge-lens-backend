import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent } from './base.agent';
import { AgentResponse, ReviewContext } from './types';

@Injectable()
export class StyleAgent extends BaseAgent {
  protected readonly logger = new Logger(StyleAgent.name);

  constructor(config: ConfigService) {
    super(config);
  }

  async review(context: ReviewContext): Promise<AgentResponse> {
    const prompt = `${this.buildDocsSection(context.docs)}You are a code quality expert reviewing a GitHub PR for style and maintainability.

Focus on:
- unclear or misleading variable/function/class names
- functions that are too long or do too many things
- missing or incorrect documentation for public APIs
- code duplication that should be extracted
- deeply nested conditionals that harm readability
- inconsistent patterns with the surrounding codebase

PR Title: ${context.title}
PR Description: ${context.description}

Diff:
${context.diff}

Return ONLY valid JSON (no explanation, no markdown):
{
  "findings": [
    {
      "file": "filename",
      "line": <integer>,
      "severity": "low" | "medium" | "high",
      "issue": "description of the style issue",
      "suggestion": "how to improve it"
    }
  ],
  "summary": "brief summary of code quality analysis"
}`;

    return this.generate(prompt);
  }
}
