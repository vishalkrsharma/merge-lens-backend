import { Injectable, OnModuleInit } from '@nestjs/common';
import * as promClient from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private reviewDurationHistogram: promClient.Histogram;
  private agentDurationHistogram: promClient.Histogram;
  private reviewsTotal: promClient.Counter;
  private findingsTotal: promClient.Counter;

  onModuleInit() {
    promClient.collectDefaultMetrics();

    this.reviewDurationHistogram = new promClient.Histogram({
      name: 'review_duration_ms',
      help: 'End-to-end PR review duration in milliseconds',
      buckets: [500, 1000, 2000, 5000, 10000, 30000, 60000],
    });

    this.agentDurationHistogram = new promClient.Histogram({
      name: 'agent_duration_ms',
      help: 'Individual agent execution duration in milliseconds',
      labelNames: ['agent'],
      buckets: [100, 500, 1000, 2000, 5000, 15000],
    });

    this.reviewsTotal = new promClient.Counter({
      name: 'reviews_total',
      help: 'Total number of PR reviews processed',
    });

    this.findingsTotal = new promClient.Counter({
      name: 'findings_total',
      help: 'Total number of findings reported',
      labelNames: ['severity', 'agent'],
    });
  }

  recordReviewDuration(durationMs: number) {
    this.reviewDurationHistogram.observe(durationMs);
    this.reviewsTotal.inc();
  }

  recordAgentDuration(agent: string, durationMs: number) {
    this.agentDurationHistogram.labels(agent).observe(durationMs);
  }

  recordFindings(agent: string, severity: string, count: number) {
    this.findingsTotal.labels(severity, agent).inc(count);
  }

  async getMetrics(): Promise<string> {
    return promClient.register.metrics();
  }
}
