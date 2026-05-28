import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FindingsService } from './findings.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Findings')
@ApiCookieAuth()
@Controller('findings')
@UseGuards(AuthGuard)
export class FindingsController {
  constructor(private readonly findingsService: FindingsService) {}

  @Get('hotspots')
  @ApiOperation({ summary: 'Top files ranked by total finding count' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of files to return', example: 5 })
  @ApiResponse({
    status: 200,
    description: 'Array of { file, count } ordered by count descending',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          count: { type: 'number' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  getHotspots(
    @CurrentUser() user: { id: string },
    @Query('limit') limit?: string,
  ) {
    return this.findingsService.getHotspots(user.id, limit ? parseInt(limit, 10) : 5);
  }

  @Get()
  @ApiOperation({ summary: 'List findings across all reviews with optional filters' })
  @ApiQuery({ name: 'agent', required: false, enum: ['bug', 'security', 'performance', 'style', 'all'] })
  @ApiQuery({ name: 'severity', required: false, enum: ['high', 'medium', 'low', 'all'] })
  @ApiQuery({ name: 'repo', required: false, description: 'Filter by owner/repo (omit or "all" for no filter)' })
  @ApiQuery({ name: 'file', required: false, description: 'Substring match on file path' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: 200,
    description: 'Paginated findings. Each item includes review: { id, owner, repo }.',
    schema: {
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  listFindings(
    @CurrentUser() user: { id: string },
    @Query('agent') agent?: string,
    @Query('severity') severity?: string,
    @Query('repo') repo?: string,
    @Query('file') file?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.findingsService.listFindings({
      userId: user.id,
      agent,
      severity,
      repo,
      file,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }
}
