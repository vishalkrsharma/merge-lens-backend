import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';

@ApiTags('Settings')
@ApiCookieAuth()
@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Current-month review usage and per-provider API cost breakdown' })
  @ApiResponse({
    status: 200,
    schema: {
      properties: {
        thisMonthReviews: { type: 'number' },
        monthlyLimit: { type: 'number', example: 50 },
        apiUsage: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              provider: { type: 'string', enum: ['anthropic', 'google', 'voyage'] },
              calls: { type: 'number' },
              inputTokens: { type: 'number' },
              outputTokens: { type: 'number' },
              costCents: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  getUsage(@CurrentUser() user: { id: string }) {
    return this.settingsService.getUsage(user.id);
  }
}
