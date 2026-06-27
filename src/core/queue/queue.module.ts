import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PgBoss from 'pg-boss';
import { PG_BOSS, REVIEW_QUEUE } from './queue.constants';
import { QueueService } from './queue.service';

@Module({
  providers: [
    {
      provide: PG_BOSS,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const boss = new PgBoss({
          connectionString: config.getOrThrow<string>('DATABASE_URL'),
          max: 3,
          deleteAfterDays: 7,
          monitorStateIntervalSeconds: 120,
        });
        await boss.start();
        await boss.createQueue(REVIEW_QUEUE, { name: REVIEW_QUEUE, retryLimit: 0 });
        return boss;
      },
    },
    QueueService,
  ],
  exports: [PG_BOSS, QueueService],
})
export class QueueModule {}
