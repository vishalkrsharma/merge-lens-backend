import { Body, Controller, Delete, Get, HttpCode, Param, Put, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ApiProvider } from '@/generated/prisma/enums';
import { AuthGuard } from '@/common/guards/auth.guard';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { ApiKeysService } from './api-keys.service';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiCookieAuth()
@Controller('settings')
@UseGuards(AuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

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
              provider: { type: 'string', enum: ['anthropic', 'google', 'openai', 'voyage'] },
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

  @Get('api-keys')
  @ApiOperation({ summary: 'List providers for which the user has a saved API key' })
  @ApiResponse({ status: 200, schema: { type: 'array', items: { type: 'string' } } })
  listApiKeys(@CurrentUser() user: { id: string }) {
    return this.apiKeysService.listProviders(user.id);
  }

  @Put('api-keys/:provider')
  @HttpCode(204)
  @ApiOperation({ summary: 'Save or replace the API key for a provider' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  saveApiKey(
    @CurrentUser() user: { id: string },
    @Param('provider') provider: ApiProvider,
    @Body() body: { key: string },
  ) {
    return this.apiKeysService.upsert(user.id, provider, body.key);
  }

  @Delete('api-keys/:provider')
  @HttpCode(204)
  @ApiOperation({ summary: 'Remove the saved API key for a provider' })
  @ApiResponse({ status: 204 })
  @ApiResponse({ status: 401, description: 'Unauthenticated' })
  deleteApiKey(
    @CurrentUser() user: { id: string },
    @Param('provider') provider: ApiProvider,
  ) {
    return this.apiKeysService.remove(user.id, provider);
  }
}
