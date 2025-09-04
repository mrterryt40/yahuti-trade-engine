import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import type { PaginationParams } from '@yahuti/contracts';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get('endpoints')
  @ApiOperation({ summary: 'Get all webhook endpoints' })
  @ApiResponse({ status: 200, description: 'Webhook endpoints retrieved successfully' })
  async getWebhookEndpoints(@Query() pagination: PaginationParams) {
    return this.webhooksService.getWebhookEndpoints(pagination);
  }

  @Get('endpoints/:id')
  @ApiOperation({ summary: 'Get webhook endpoint by ID' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  async getWebhookEndpointById(@Param('id') id: string) {
    return this.webhooksService.getWebhookEndpointById(id);
  }

  @Post('endpoints')
  @ApiOperation({ summary: 'Create new webhook endpoint' })
  @ApiResponse({ status: 201, description: 'Webhook endpoint created successfully' })
  async createWebhookEndpoint(@Body() endpoint: any) {
    return this.webhooksService.createWebhookEndpoint(endpoint);
  }

  @Patch('endpoints/:id')
  @ApiOperation({ summary: 'Update webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint updated successfully' })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  async updateWebhookEndpoint(@Param('id') id: string, @Body() updates: any) {
    return this.webhooksService.updateWebhookEndpoint(id, updates);
  }

  @Delete('endpoints/:id')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  @ApiResponse({ status: 200, description: 'Webhook endpoint deleted successfully' })
  @ApiResponse({ status: 404, description: 'Webhook endpoint not found' })
  async deleteWebhookEndpoint(@Param('id') id: string) {
    return this.webhooksService.deleteWebhookEndpoint(id);
  }

  @Get('deliveries')
  @ApiOperation({ summary: 'Get webhook delivery history' })
  @ApiResponse({ status: 200, description: 'Webhook deliveries retrieved successfully' })
  async getWebhookDeliveries(@Query() pagination: PaginationParams, @Query('endpointId') endpointId?: string) {
    return this.webhooksService.getWebhookDeliveries(pagination, endpointId);
  }

  @Post('deliveries/:id/retry')
  @ApiOperation({ summary: 'Retry failed webhook delivery' })
  @ApiResponse({ status: 200, description: 'Webhook delivery retried successfully' })
  async retryWebhookDelivery(@Param('id') id: string) {
    return this.webhooksService.retryWebhookDelivery(id);
  }

  @Post('incoming/:provider')
  @ApiOperation({ summary: 'Handle incoming webhook from external provider' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async handleIncomingWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers() headers: Record<string, string>
  ) {
    return this.webhooksService.handleIncomingWebhook(provider, payload, headers);
  }

  @Post('test/:id')
  @ApiOperation({ summary: 'Send test webhook' })
  @ApiResponse({ status: 200, description: 'Test webhook sent successfully' })
  async testWebhook(@Param('id') id: string) {
    return this.webhooksService.testWebhook(id);
  }
}