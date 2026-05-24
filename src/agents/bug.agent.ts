import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent } from './base.agent';
import { AgentResponse, ReviewContext } from './types';

@Injectable()
export class BugAgent extends BaseAgent {
  protected readonly logger = new Logger(BugAgent.name);

  constructor(config: ConfigService) {
    super(config);
  }

  async review(context: ReviewContext): Promise<AgentResponse> {
    const prompt = `${this.buildDocsSection(context.docs)}You are a bug detection expert reviewing a GitHub PR.

Focus on:
- null/undefined dereferences and missing null checks
- edge cases and boundary conditions
- race conditions and concurrency issues
- logic errors and off-by-one mistakes
- unhandled exceptions and error paths

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
      "issue": "description of the bug",
      "suggestion": "how to fix it"
    }
  ],
  "summary": "brief summary of bug analysis"
}`;

    return this.generate(prompt);
  }
}
