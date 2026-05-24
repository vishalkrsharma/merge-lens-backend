import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { REVIEW_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({
      name: REVIEW_QUEUE,
    }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
