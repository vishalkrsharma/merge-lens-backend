import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBody,
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RepositoriesService } from './repositories.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { AgentType, Severity } from '@/generated/prisma/enums';

interface UpdateRepositoryBody {
  enabledAgents?: AgentType[];
  severityThreshold?: Severity;
}

@ApiTags('Repositories')
@ApiCookieAuth()
@Controller('repositories')
@UseGuards(AuthGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  @ApiOperation({ summary: 'List all repositories with the GitHub App installed' })
  @ApiResponse({ status: 200, description: 'Array of Repository objects ordered by install date descending' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  listRepositories(@CurrentUser() user: { id: string }) {
    return this.repositoriesService.listRepositories(user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent configuration for a repository' })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  @ApiBody({
    schema: {
      properties: {
        enabledAgents: {
          type: 'array',
          items: { type: 'string', enum: ['bug', 'security', 'performance', 'style'] },
          example: ['bug', 'security'],
        },
        severityThreshold: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          example: 'medium',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated Repository object' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 404, description: 'Repository not found or not owned by the user' })
  updateRepository(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: UpdateRepositoryBody,
  ) {
    return this.repositoriesService.updateRepository(id, user.id, body);
  }
}
