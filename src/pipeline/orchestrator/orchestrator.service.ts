import { Injectable, Logger } from '@nestjs/common';
import { ApiProvider, AgentType } from '@/generated/prisma/enums';
import { BugAgent } from '@/pipeline/agents/bug.agent';
import { SecurityAgent } from '@/pipeline/agents/security.agent';
import { PerformanceAgent } from '@/pipeline/agents/performance.agent';
import { StyleAgent } from '@/pipeline/agents/style.agent';
import { SummaryAgent } from '@/pipeline/agents/summary.agent';
import { AgentResponse, OrchestratorResult, ReviewContext } from '@/pipeline/agents/types';
import { MetricsService } from '@/core/observability/metrics.service';
import { TracingService } from '@/core/observability/tracing.service';
import { DEFAULT_MODEL_ID, defaultModelForProvider, findModel } from '@/pipeline/llm/model-catalog';

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
  ) {}

  async execute(
    context: ReviewContext,
    enabledAgents: AgentType[] = [],
    apiKeys: Partial<Record<ApiProvider, string>> = {},
    preferredProvider?: ApiProvider | null,
    preferredModel?: string | null,
  ): Promise<OrchestratorResult> {
    const span = this.tracing.startSpan('orchestrator.execute');

    const active = enabledAgents.length === 0
      ? (['bug', 'security', 'performance', 'style'] as AgentType[])
      : enabledAgents;

    const { provider, apiKey, modelId } = this.resolveModel(apiKeys, preferredProvider, preferredModel);

    this.logger.log(`Starting review with agents: ${active.join(', ')} using provider: ${String(provider)}, model: ${modelId}`);

    const agentStart = Date.now();

    const run = (name: AgentType, fn: () => Promise<AgentResponse>) =>
      active.includes(name) ? this.runAgent(name, fn) : Promise.resolve(DISABLED_AGENT);

    const [bug, security, performance, style] = await Promise.all([
      run('bug', () => this.bugAgent.review(context, provider, apiKey, modelId)),
      run('security', () => this.securityAgent.review(context, provider, apiKey, modelId)),
      run('performance', () => this.performanceAgent.review(context, provider, apiKey, modelId)),
      run('style', () => this.styleAgent.review(context, provider, apiKey, modelId)),
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
      modelId,
    );
    this.metrics.recordAgentDuration('summary_agent', Date.now() - summaryStart);

    span.end();
    return { bug, security, performance, style, overallSummary };
  }

  private resolveModel(
    apiKeys: Partial<Record<ApiProvider, string>>,
    preferredProvider?: ApiProvider | null,
    preferredModel?: string | null,
  ): { provider: ApiProvider; apiKey: string; modelId: string } {
    // If a specific model is set, derive the provider from the catalog
    if (preferredModel) {
      const entry = findModel(preferredModel);
      if (entry) {
        const userKey = apiKeys[entry.provider];
        if (userKey) return { provider: entry.provider, apiKey: userKey, modelId: preferredModel };
      }
    }

    // Fall back to provider preference (legacy)
    const target = preferredProvider ?? ApiProvider.google;
    const userKey = apiKeys[target];
    if (userKey) {
      return { provider: target, apiKey: userKey, modelId: defaultModelForProvider(target) };
    }

    throw new Error(
      `No API key configured for provider "${String(preferredProvider ?? 'google')}". Add your key at Settings → AI Models.`,
    );
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
