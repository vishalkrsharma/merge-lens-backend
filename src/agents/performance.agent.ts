import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BaseAgent } from './base.agent';
import { AgentResponse, ReviewContext } from './types';

@Injectable()
export class PerformanceAgent extends BaseAgent {
  protected readonly logger = new Logger(PerformanceAgent.name);

  constructor(config: ConfigService) {
    super(config);
  }

  async review(context: ReviewContext): Promise<AgentResponse> {
    const prompt = `${this.buildDocsSection(context.docs)}You are a performance optimization expert reviewing a GitHub PR.

Focus on:
- unnecessary loops or nested iterations (O(n²) or worse)
- expensive operations inside loops
- N+1 query patterns and inefficient database access
- missing indexes or non-selective queries
- unnecessary memory allocations or large object copies
- blocking I/O in async contexts

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
      "issue": "description of the performance issue",
      "suggestion": "how to optimize it"
    }
  ],
  "summary": "brief summary of performance analysis"
}`;

    return this.generate(prompt);
  }
}
