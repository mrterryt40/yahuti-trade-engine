import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { KpisService } from './kpis.service';
import type { KpiSummary, SystemStatus } from '@yahuti/contracts';

@ApiTags('KPIs')
@Controller('kpis')
export class KpisController {
  constructor(private readonly kpisService: KpisService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get KPI summary for Command Deck' })
  @ApiResponse({ status: 200, description: 'KPI summary retrieved successfully' })
  async getSummary(): Promise<KpiSummary> {
    return this.kpisService.getSummary();
  }

  @Get('status')
  @ApiOperation({ summary: 'Get system module status' })
  @ApiResponse({ status: 200, description: 'System status retrieved successfully' })
  async getSystemStatus(): Promise<SystemStatus> {
    return this.kpisService.getSystemStatus();
  }
}