import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StatsService } from './stats.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Stats')
@ApiCookieAuth()
@Controller('stats')
@UseGuards(AuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get dashboard statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description:
      'Aggregated stats including review counts, findings by agent/severity, and time-series data',
    schema: {
      properties: {
        totalReviews: { type: 'number' },
        totalFindings: { type: 'number' },
        findingsByAgent: {
          type: 'object',
          properties: {
            bug: { type: 'number' },
            security: { type: 'number' },
            performance: { type: 'number' },
            style: { type: 'number' },
          },
        },
        findingsBySeverity: {
          type: 'object',
          properties: {
            low: { type: 'number' },
            medium: { type: 'number' },
            high: { type: 'number' },
          },
        },
        reviewsOverTime: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: { type: 'string', example: '2026-05-01' },
              count: { type: 'number' },
            },
          },
        },
        avgDurationMs: { type: 'number' },
        thisMonthReviews: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  getStats(@CurrentUser() user: { id: string }) {
    return this.statsService.getStats(user.id);
  }
}
