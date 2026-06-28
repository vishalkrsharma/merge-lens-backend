import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Reviews')
@ApiCookieAuth()
@Controller('reviews')
@UseGuards(AuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @ApiOperation({
    summary: 'List reviews with optional filters and pagination',
  })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Substring match on PR title',
  })
  @ApiQuery({
    name: 'repo',
    required: false,
    description: 'Filter by owner/repo (omit or "all" for no filter)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'running', 'completed', 'failed', 'all'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (1-based)',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page',
    example: 20,
  })
  @ApiResponse({
    status: 200,
    description:
      'Paginated list of reviews. Each item includes computed findingCounts.',
    schema: {
      properties: {
        data: { type: 'array', items: { type: 'object' } },
        total: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  listReviews(
    @CurrentUser() user: { id: string },
    @Query('q') q?: string,
    @Query('repo') repo?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reviewsService.listReviews({
      userId: user.id,
      q,
      repo,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get a single review with its findings and summary',
  })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({
    status: 200,
    description:
      'Review detail including findings array and summary (null if not yet completed)',
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  @ApiResponse({
    status: 404,
    description: 'Review not found or not owned by the user',
  })
  getReview(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.reviewsService.getReview(id, user.id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed review' })
  @ApiParam({ name: 'id', description: 'Review ID' })
  @ApiResponse({ status: 200, description: 'Review requeued' })
  @ApiResponse({ status: 400, description: 'Review is not in failed state' })
  @ApiResponse({ status: 404, description: 'Review not found' })
  retryReview(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return this.reviewsService.retryReview(id, user.id);
  }
}
