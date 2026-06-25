import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import PgBoss from 'pg-boss';
import { PG_BOSS } from './queue.constants';
import { REVIEW_QUEUE, ReviewJobData } from './queue.constants';

@Injectable()
export class QueueService implements OnApplicationShutdown {
  constructor(@Inject(PG_BOSS) private readonly boss: PgBoss) {}

  async addReviewJob(data: ReviewJobData): Promise<string | null> {
    return this.boss.send(REVIEW_QUEUE, data);
  }

  async onApplicationShutdown() {
    await this.boss.stop({ graceful: true });
  }
}
