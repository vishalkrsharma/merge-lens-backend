import { Injectable, Logger } from '@nestjs/common';
import { AgentFinding, OrchestratorResult } from '@/pipeline/agents/types';
import { GithubService } from '@/integrations/github/github.service';

@Injectable()
export class CommentsService {
  private readonly logger = new Logger(CommentsService.name);

  constructor(private readonly githubService: GithubService) {}

  async postOrchestratorResults(
    owner: string,
    repo: string,
    pullNumber: number,
    commitId: string,
    result: OrchestratorResult,
  ): Promise<void> {
    const summaryBody = this.buildSummaryComment(result);
    await this.githubService.postIssueComment(
      owner,
      repo,
      pullNumber,
      summaryBody,
    );
    this.logger.log('Posted PR summary comment');

    const allFindings: Array<{ agent: string; finding: AgentFinding }> = [
      ...result.bug.findings.map((f) => ({ agent: 'bug', finding: f })),
      ...result.security.findings.map((f) => ({
        agent: 'security',
        finding: f,
      })),
      ...result.performance.findings.map((f) => ({
        agent: 'performance',
        finding: f,
      })),
      ...result.style.findings.map((f) => ({ agent: 'style', finding: f })),
    ];

    for (const { agent, finding } of allFindings) {
      try {
        const body = this.formatFinding(agent, finding);
        await this.githubService.postReviewComment(
          owner,
          repo,
          pullNumber,
          commitId,
          finding.file,
          finding.line,
          body,
        );
      } catch {
        this.logger.warn(
          `Skipped inline comment on ${finding.file}:${finding.line}`,
        );
      }
    }
  }

  private buildSummaryComment(result: OrchestratorResult): string {
    const sections: string[] = ['## MergeLens AI Review\n'];

    sections.push(`### Summary\n${result.overallSummary}\n`);

    const agentSections: Array<{
      label: string;
      icon: string;
      response: typeof result.bug;
    }> = [
      { label: 'Bug Analysis', icon: '🐛', response: result.bug },
      { label: 'Security Analysis', icon: '🔒', response: result.security },
      {
        label: 'Performance Analysis',
        icon: '⚡',
        response: result.performance,
      },
      { label: 'Style Analysis', icon: '✨', response: result.style },
    ];

    for (const { label, icon, response } of agentSections) {
      sections.push(`### ${icon} ${label}`);
      sections.push(response.summary);
      if (response.findings.length > 0) {
        const high = response.findings.filter(
          (f) => f.severity === 'high',
        ).length;
        const med = response.findings.filter(
          (f) => f.severity === 'medium',
        ).length;
        const low = response.findings.filter(
          (f) => f.severity === 'low',
        ).length;
        sections.push(`\n_Findings: ${high} high, ${med} medium, ${low} low_`);
      }
      sections.push('');
    }

    sections.push(
      '---\n_Reviewed by [MergeLens](https://github.com) multi-agent AI_',
    );
    return sections.join('\n');
  }

  private formatFinding(agent: string, finding: AgentFinding): string {
    const icons: Record<string, string> = {
      bug: '🐛',
      security: '🔒',
      performance: '⚡',
      style: '✨',
    };
    const severityBadge =
      { high: '🔴 High', medium: '🟡 Medium', low: '🟢 Low' }[
        finding.severity
      ] ?? finding.severity;
    return `${icons[agent] ?? '📌'} **${severityBadge}** (${agent})\n\n${finding.issue}\n\n**Suggestion:** ${finding.suggestion}`;
  }
}
