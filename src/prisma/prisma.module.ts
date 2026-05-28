import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { prisma } from '@/lib/auth';

@Global()
@Module({
  providers: [
    {
      provide: PrismaService,
      useValue: prisma,
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
