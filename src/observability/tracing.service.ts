import { Injectable, Logger } from '@nestjs/common';

export interface Span {
  name: string;
  startTime: number;
  end(): void;
}

@Injectable()
export class TracingService {
  private readonly logger = new Logger(TracingService.name);

  startSpan(name: string): Span {
    const startTime = Date.now();
    this.logger.debug(`Span started: ${name}`);

    return {
      name,
      startTime,
      end: () => {
        const duration = Date.now() - startTime;
        this.logger.debug(`Span ended: ${name} (${duration}ms)`);
      },
    };
  }

  async trace<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const span = this.startSpan(name);
    try {
      return await fn();
    } finally {
      span.end();
    }
  }
}
