import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async healthCheck() {
    this.logger.log('Basic health check requested');
    
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'yahuti-trade-engine-api',
      version: '1.0.0',
    };
  }

  async detailedHealthCheck() {
    this.logger.log('Detailed health check requested');
    
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkExternalAPIs(),
      this.checkSystemResources(),
    ]);

    const [database, redis, externalAPIs, systemResources] = checks;

    return {
      status: checks.every(check => check.status === 'fulfilled' && check.value.status === 'ok') ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'yahuti-trade-engine-api',
      version: '1.0.0',
      checks: {
        database: database.status === 'fulfilled' ? database.value : { status: 'error', error: database.reason },
        redis: redis.status === 'fulfilled' ? redis.value : { status: 'error', error: redis.reason },
        externalAPIs: externalAPIs.status === 'fulfilled' ? externalAPIs.value : { status: 'error', error: externalAPIs.reason },
        systemResources: systemResources.status === 'fulfilled' ? systemResources.value : { status: 'error', error: systemResources.reason },
      },
    };
  }

  async checkDependencies() {
    this.logger.log('Checking external dependencies');
    
    // Mock response for now
    return {
      database: {
        status: 'ok',
        responseTime: 15,
        connections: { active: 5, max: 20 },
      },
      redis: {
        status: 'ok',
        responseTime: 3,
        memory: { used: '125MB', max: '512MB' },
      },
      marketplaces: {
        ebay: { status: 'ok', lastCheck: new Date().toISOString() },
        amazon: { status: 'ok', lastCheck: new Date().toISOString() },
        g2g: { status: 'degraded', lastCheck: new Date().toISOString(), error: 'Rate limited' },
      },
    };
  }

  async getSystemMetrics() {
    this.logger.log('Getting system performance metrics');
    
    // Mock response for now
    return {
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
        external: process.memoryUsage().external,
      },
      cpu: {
        usage: Math.random() * 100, // Mock CPU usage
        loadAverage: [0.5, 0.7, 0.8], // Mock load average
      },
      requests: {
        total: 15420,
        perMinute: 25,
        errorRate: 0.02,
        avgResponseTime: 145,
      },
      database: {
        connections: 5,
        queriesPerSecond: 12,
        avgQueryTime: 8.5,
      },
    };
  }

  async readinessProbe() {
    this.logger.log('Readiness probe check');
    
    // Check if service is ready to receive traffic
    const isReady = await this.checkCriticalDependencies();
    
    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
    };
  }

  async livenessProbe() {
    this.logger.log('Liveness probe check');
    
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
    };
  }

  async reportHealthAlert(alert: any) {
    this.logger.log('Health alert reported', alert);
    
    // Mock response for now
    return {
      success: true,
      alertId: 'alert-' + Date.now(),
      reported: new Date().toISOString(),
      alert,
    };
  }

  async getUptime() {
    this.logger.log('Getting uptime information');
    
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
      startTime: new Date(this.startTime).toISOString(),
      currentTime: new Date().toISOString(),
      uptimeMs,
      uptimeFormatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      restarts: 0, // Would track actual restarts in production
    };
  }

  private async checkDatabase() {
    try {
      // Simple database connectivity test
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', responseTime: 15 };
    } catch (error) {
      return { status: 'error', error: error.message };
    }
  }

  private async checkRedis() {
    // Mock Redis check for now
    return { status: 'ok', responseTime: 3 };
  }

  private async checkExternalAPIs() {
    // Mock external API checks for now
    return { status: 'ok', services: ['ebay', 'amazon', 'g2g'] };
  }

  private async checkSystemResources() {
    const memoryUsage = process.memoryUsage();
    return {
      status: 'ok',
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100,
      },
    };
  }

  private async checkCriticalDependencies(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      this.logger.error('Critical dependency check failed', error);
      return false;
    }
  }
}