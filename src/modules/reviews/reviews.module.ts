import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { QueueModule } from '@/core/queue/queue.module';

@Module({
  imports: [PrismaModule, QueueModule],
  controllers: [ReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
