import { Controller, Get, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Basic health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  async healthCheck() {
    return this.healthService.healthCheck();
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Detailed health check with all dependencies' })
  @ApiResponse({ status: 200, description: 'Detailed health status retrieved successfully' })
  async detailedHealthCheck() {
    return this.healthService.detailedHealthCheck();
  }

  @Get('dependencies')
  @ApiOperation({ summary: 'Check status of external dependencies' })
  @ApiResponse({ status: 200, description: 'Dependencies status retrieved successfully' })
  async checkDependencies() {
    return this.healthService.checkDependencies();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get system performance metrics' })
  @ApiResponse({ status: 200, description: 'System metrics retrieved successfully' })
  async getSystemMetrics() {
    return this.healthService.getSystemMetrics();
  }

  @Get('readiness')
  @ApiOperation({ summary: 'Kubernetes readiness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is ready to receive traffic' })
  async readinessProbe() {
    return this.healthService.readinessProbe();
  }

  @Get('liveness')
  @ApiOperation({ summary: 'Kubernetes liveness probe endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async livenessProbe() {
    return this.healthService.livenessProbe();
  }

  @Post('alerts')
  @ApiOperation({ summary: 'Report health alert' })
  @ApiResponse({ status: 200, description: 'Health alert reported successfully' })
  async reportHealthAlert(@Body() alert: any) {
    return this.healthService.reportHealthAlert(alert);
  }

  @Get('uptime')
  @ApiOperation({ summary: 'Get service uptime information' })
  @ApiResponse({ status: 200, description: 'Uptime information retrieved successfully' })
  async getUptime() {
    return this.healthService.getUptime();
  }
}