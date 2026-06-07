import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
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

interface AddRepositoryBody {
  repoId: number;
  fullName: string;
}

interface UpdateRepositoryBody {
  enabledAgents?: AgentType[];
  severityThreshold?: Severity;
  isActive?: boolean;
}

@ApiTags('Repositories')
@ApiCookieAuth()
@Controller('repositories')
@UseGuards(AuthGuard)
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List all repositories with the GitHub App installed',
  })
  @ApiResponse({
    status: 200,
    description:
      'Array of Repository objects ordered by install date descending',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  listRepositories(@CurrentUser() user: { id: string }) {
    return this.repositoriesService.listRepositories(user.id);
  }

  @Get('available')
  @ApiOperation({
    summary:
      'List GitHub repos owned by the user that are not yet added to MergeLens',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of GitHub repositories available to add',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({ status: 404, description: 'GitHub account not linked' })
  listAvailableRepositories(@CurrentUser() user: { id: string }) {
    return this.repositoriesService.listAvailableRepositories(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Add a GitHub repository to MergeLens' })
  @ApiBody({
    schema: {
      required: ['repoId', 'fullName'],
      properties: {
        repoId: {
          type: 'number',
          description: "GitHub's numeric repository ID",
          example: 123456789,
        },
        fullName: {
          type: 'string',
          description: 'owner/repo',
          example: 'octocat/hello-world',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Repository added and synced to MergeLens',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({
    status: 404,
    description: 'GitHub App installation not found',
  })
  addRepository(
    @CurrentUser() user: { id: string },
    @Body() body: AddRepositoryBody,
  ) {
    console.log('ID', user.id);
    console.log('BODY', body);

    return this.repositoriesService.addRepository(
      user.id,
      body.repoId,
      body.fullName,
    );
  }

  @Post('sync')
  @ApiOperation({
    summary:
      'Sync repositories with GitHub App installation, removing any that lost access',
  })
  @ApiResponse({
    status: 200,
    description: 'Sync result with removed repo names',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({
    status: 404,
    description: 'GitHub App installation not found',
  })
  syncRepositories(@CurrentUser() user: { id: string }) {
    return this.repositoriesService.syncRepositories(user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a repository from MergeLens' })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  @ApiResponse({ status: 200, description: 'Deleted Repository object' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({
    status: 404,
    description: 'Repository not found or not owned by the user',
  })
  deleteRepository(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.repositoriesService.deleteRepository(id, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update agent configuration for a repository' })
  @ApiParam({ name: 'id', description: 'Repository ID' })
  @ApiBody({
    schema: {
      properties: {
        enabledAgents: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['bug', 'security', 'performance', 'style'],
          },
          example: ['bug', 'security'],
        },
        severityThreshold: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          example: 'medium',
        },
        isActive: {
          type: 'boolean',
          description: 'Enable or disable automatic PR reviews for this repository',
          example: false,
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Updated Repository object' })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({
    status: 404,
    description: 'Repository not found or not owned by the user',
  })
  updateRepository(
    @Param('id') id: string,
    @CurrentUser() user: { id: string },
    @Body() body: UpdateRepositoryBody,
  ) {
    return this.repositoriesService.updateRepository(id, user.id, body);
  }
}
