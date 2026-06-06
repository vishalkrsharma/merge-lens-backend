import { Module } from '@nestjs/common';
import { RepositoriesController } from './repositories.controller';
import { RepositoriesService } from './repositories.service';
import { PrismaModule } from '@/core/prisma/prisma.module';
import { GithubModule } from '@/integrations/github/github.module';

@Module({
  imports: [PrismaModule, GithubModule],
  controllers: [RepositoriesController],
  providers: [RepositoriesService],
})
export class RepositoriesModule {}
