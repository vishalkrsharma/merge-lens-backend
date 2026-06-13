import { Injectable, Logger } from '@nestjs/common';
import { ApiProvider } from '@/generated/prisma/enums';
import { LlmService } from '@/pipeline/llm/llm.service';
import { BaseAgent } from './base.agent';
import { AgentResponse, ReviewContext } from './types';

@Injectable()
export class SecurityAgent extends BaseAgent {
  protected readonly logger = new Logger(SecurityAgent.name);

  constructor(llm: LlmService) {
    super(llm);
  }

  async review(context: ReviewContext, provider: ApiProvider, apiKey: string): Promise<AgentResponse> {
    const prompt = `${this.buildDocsSection(context.docs)}You are a security expert reviewing a GitHub PR for vulnerabilities.

Focus on:
- exposed secrets, API keys, or credentials in code
- SQL/command/script injection risks
- insecure authentication or authorization patterns
- exposed internal APIs or sensitive endpoints
- insecure data handling (plaintext passwords, unencrypted PII)
- OWASP Top 10 vulnerabilities

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
      "issue": "description of the security issue",
      "suggestion": "how to fix it"
    }
  ],
  "summary": "brief summary of security analysis"
}`;

    return this.generate(prompt, provider, apiKey);
  }
}
