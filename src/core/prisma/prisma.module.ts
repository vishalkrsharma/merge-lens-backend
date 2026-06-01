import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { prisma } from '@/core/auth/auth';

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
