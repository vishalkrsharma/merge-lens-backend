import { Module } from '@nestjs/common';
import { LlmModule } from '@/pipeline/llm/llm.module';
import { BugAgent } from './bug.agent';
import { SecurityAgent } from './security.agent';
import { PerformanceAgent } from './performance.agent';
import { StyleAgent } from './style.agent';
import { SummaryAgent } from './summary.agent';

@Module({
  imports: [LlmModule],
  providers: [BugAgent, SecurityAgent, PerformanceAgent, StyleAgent, SummaryAgent],
  exports: [BugAgent, SecurityAgent, PerformanceAgent, StyleAgent, SummaryAgent],
})
export class AgentsModule {}
