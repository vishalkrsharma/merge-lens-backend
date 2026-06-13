import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiProvider, AgentType } from '@/generated/prisma/enums';
import { BugAgent } from '@/pipeline/agents/bug.agent';
import { SecurityAgent } from '@/pipeline/agents/security.agent';
import { PerformanceAgent } from '@/pipeline/agents/performance.agent';
import { StyleAgent } from '@/pipeline/agents/style.agent';
import { SummaryAgent } from '@/pipeline/agents/summary.agent';
import { AgentResponse, OrchestratorResult, ReviewContext } from '@/pipeline/agents/types';
import { MetricsService } from '@/core/observability/metrics.service';
import { TracingService } from '@/core/observability/tracing.service';

const DISABLED_AGENT: AgentResponse = { findings: [], summary: '' };

@Injectable()
export class OrchestratorService {
  private readonly logger = new Logger(OrchestratorService.name);

  constructor(
    private readonly bugAgent: BugAgent,
    private readonly securityAgent: SecurityAgent,
    private readonly performanceAgent: PerformanceAgent,
    private readonly styleAgent: StyleAgent,
    private readonly summaryAgent: SummaryAgent,
    private readonly metrics: MetricsService,
    private readonly tracing: TracingService,
    private readonly config: ConfigService,
  ) {}

  async execute(
    context: ReviewContext,
    enabledAgents: AgentType[] = [],
    apiKeys: Partial<Record<ApiProvider, string>> = {},
    preferredProvider?: ApiProvider | null,
  ): Promise<OrchestratorResult> {
    const span = this.tracing.startSpan('orchestrator.execute');

    const active = enabledAgents.length === 0
      ? (['bug', 'security', 'performance', 'style'] as AgentType[])
      : enabledAgents;

    const { provider, apiKey } = this.resolveProviderKey(apiKeys, preferredProvider);

    this.logger.log(`Starting review with agents: ${active.join(', ')} using provider: ${String(provider)}`);

    const agentStart = Date.now();

    const run = (name: AgentType, fn: () => Promise<AgentResponse>) =>
      active.includes(name) ? this.runAgent(name, fn) : Promise.resolve(DISABLED_AGENT);

    const [bug, security, performance, style] = await Promise.all([
      run('bug', () => this.bugAgent.review(context, provider, apiKey)),
      run('security', () => this.securityAgent.review(context, provider, apiKey)),
      run('performance', () => this.performanceAgent.review(context, provider, apiKey)),
      run('style', () => this.styleAgent.review(context, provider, apiKey)),
    ]);

    const agentDuration = Date.now() - agentStart;
    this.logger.log(`All agents completed in ${agentDuration}ms`);
    this.metrics.recordAgentDuration('all_agents', agentDuration);

    const summaryStart = Date.now();
    const overallSummary = await this.summaryAgent.summarize(
      context,
      { bug, security, performance, style },
      provider,
      apiKey,
    );
    this.metrics.recordAgentDuration('summary_agent', Date.now() - summaryStart);

    span.end();
    return { bug, security, performance, style, overallSummary };
  }

  private resolveProviderKey(
    apiKeys: Partial<Record<ApiProvider, string>>,
    preferredProvider?: ApiProvider | null,
  ): { provider: ApiProvider; apiKey: string } {
    const target = preferredProvider ?? ApiProvider.google;
    const userKey = apiKeys[target];

    if (userKey) return { provider: target, apiKey: userKey };

    if (target !== ApiProvider.google) {
      this.logger.warn(
        `No API key for preferred provider ${String(target)}, falling back to google system key`,
      );
    }

    return {
      provider: ApiProvider.google,
      apiKey: this.config.getOrThrow<string>('GOOGLE_API_KEY'),
    };
  }

  private async runAgent<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const span = this.tracing.startSpan(`agent.${name}`);
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.logger.log(`${name} agent completed in ${duration}ms`);
      this.metrics.recordAgentDuration(name, duration);
      return result;
    } finally {
      span.end();
    }
  }
}
