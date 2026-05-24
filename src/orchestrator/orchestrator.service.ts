import { Injectable, Logger } from '@nestjs/common';
import { BugAgent } from '@/agents/bug.agent';
import { SecurityAgent } from '@/agents/security.agent';
import { PerformanceAgent } from '@/agents/performance.agent';
import { StyleAgent } from '@/agents/style.agent';
import { SummaryAgent } from '@/agents/summary.agent';
import { OrchestratorResult, ReviewContext } from '@/agents/types';
import { MetricsService } from '@/observability/metrics.service';
import { TracingService } from '@/observability/tracing.service';

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

  async execute(context: ReviewContext): Promise<OrchestratorResult> {
    const span = this.tracing.startSpan('orchestrator.execute');
    this.logger.log('Starting multi-agent review in parallel');

    const agentStart = Date.now();

    const [bug, security, performance, style] = await Promise.all([
      this.runAgent('bug', () => this.bugAgent.review(context)),
      this.runAgent('security', () => this.securityAgent.review(context)),
      this.runAgent('performance', () => this.performanceAgent.review(context)),
      this.runAgent('style', () => this.styleAgent.review(context)),
    ]);

    const agentDuration = Date.now() - agentStart;
    this.logger.log(`All agents completed in ${agentDuration}ms`);
    this.metrics.recordAgentDuration('all_agents', agentDuration);

    const summaryStart = Date.now();
    const overallSummary = await this.summaryAgent.summarize(context, {
      bug,
      security,
      performance,
      style,
    });
    this.metrics.recordAgentDuration(
      'summary_agent',
      Date.now() - summaryStart,
    );

    span.end();
    return { bug, security, performance, style, overallSummary };
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
