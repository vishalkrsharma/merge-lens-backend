import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { MetricsService } from './metrics.service';
import { TracingService } from './tracing.service';
import { MetricsController } from './metrics.controller';

@Module({
  controllers: [MetricsController],
  providers: [LoggerService, MetricsService, TracingService],
  exports: [LoggerService, MetricsService, TracingService],
})
export class ObservabilityModule {}
