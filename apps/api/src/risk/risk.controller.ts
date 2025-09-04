import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { RiskService } from './risk.service';
import type { RiskStatus, Alert, GovernorUpdateRequest, PaginationParams } from '@yahuti/contracts';

@ApiTags('Risk')
@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Get('status')
  @ApiOperation({ summary: 'Get current risk status' })
  @ApiResponse({ status: 200, description: 'Risk status retrieved successfully' })
  async getRiskStatus(): Promise<RiskStatus> {
    return this.riskService.getRiskStatus();
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Get all risk alerts' })
  @ApiResponse({ status: 200, description: 'Risk alerts retrieved successfully' })
  async getAlerts(@Query() pagination: PaginationParams) {
    return this.riskService.getAlerts(pagination);
  }

  @Get('alerts/:id')
  @ApiOperation({ summary: 'Get risk alert by ID' })
  @ApiResponse({ status: 200, description: 'Risk alert retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async getAlertById(@Param('id') id: string): Promise<Alert> {
    return this.riskService.getAlertById(id);
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Create new risk alert' })
  @ApiResponse({ status: 201, description: 'Risk alert created successfully' })
  async createAlert(@Body() alert: Partial<Alert>): Promise<Alert> {
    return this.riskService.createAlert(alert);
  }

  @Patch('alerts/:id')
  @ApiOperation({ summary: 'Update risk alert' })
  @ApiResponse({ status: 200, description: 'Risk alert updated successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async updateAlert(@Param('id') id: string, @Body() updates: Partial<Alert>): Promise<Alert> {
    return this.riskService.updateAlert(id, updates);
  }

  @Delete('alerts/:id')
  @ApiOperation({ summary: 'Delete risk alert' })
  @ApiResponse({ status: 200, description: 'Risk alert deleted successfully' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async deleteAlert(@Param('id') id: string) {
    return this.riskService.deleteAlert(id);
  }

  @Post('governor')
  @ApiOperation({ summary: 'Update governor state' })
  @ApiResponse({ status: 200, description: 'Governor updated successfully' })
  async updateGovernor(@Body() request: GovernorUpdateRequest) {
    return this.riskService.updateGovernor(request);
  }

  @Post('alerts/:id/resolve')
  @ApiOperation({ summary: 'Resolve risk alert' })
  @ApiResponse({ status: 200, description: 'Alert resolved successfully' })
  async resolveAlert(@Param('id') id: string) {
    return this.riskService.resolveAlert(id);
  }
}