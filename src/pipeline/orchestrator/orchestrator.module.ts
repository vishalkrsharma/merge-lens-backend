import { Module } from '@nestjs/common';
import { AgentsModule } from '@/pipeline/agents/agents.module';
import { ObservabilityModule } from '@/core/observability/observability.module';
import { OrchestratorService } from './orchestrator.service';

@Module({
  imports: [AgentsModule, ObservabilityModule],
  providers: [OrchestratorService],
  exports: [OrchestratorService],
})
export class OrchestratorModule {}
