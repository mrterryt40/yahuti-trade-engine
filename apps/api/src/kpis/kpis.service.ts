import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { KpiSummary, SystemStatus } from '@yahuti/contracts';

@Injectable()
export class KpisService {
  private readonly logger = new Logger(KpisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getSummary(): Promise<KpiSummary> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get today's transactions
      const todayTransactions = await this.prisma.transaction.findMany({
        where: {
          createdAt: { gte: today },
          status: { in: ['DELIVERED', 'PAID'] },
        },
      });

      // Get MTD transactions
      const mtdTransactions = await this.prisma.transaction.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          status: { in: ['DELIVERED', 'PAID'] },
        },
      });

      // Calculate today's P&L
      const pnlToday = todayTransactions.reduce(
        (sum, tx) => sum + Number(tx.net),
        0
      );

      // Calculate MTD P&L
      const pnlMtd = mtdTransactions.reduce(
        (sum, tx) => sum + Number(tx.net),
        0
      );

      // Calculate bankroll (available inventory cost + cash balance)
      const availableInventory = await this.prisma.inventory.findMany({
        where: { status: 'AVAILABLE' },
      });
      
      const inventoryValue = availableInventory.reduce(
        (sum, inv) => sum + Number(inv.cost),
        0
      );

      // Mock cash balance for now (this would come from payment providers)
      const cashBalance = 2500.00;
      const bankroll = inventoryValue + cashBalance;

      // Calculate flips today
      const flipsToday = todayTransactions.filter(tx => tx.status === 'DELIVERED').length;

      // Calculate average profit per flip
      const avgProfitPerFlip = flipsToday > 0 ? pnlToday / flipsToday : 0;

      // Calculate sell-through time (mock for now)
      const sellThroughHours = 22.4;

      // Calculate dispute rate (7 days)
      const disputes7d = await this.prisma.transaction.count({
        where: {
          createdAt: { gte: sevenDaysAgo },
          status: { in: ['DISPUTED', 'CHARGEBACK'] },
        },
      });

      const total7d = await this.prisma.transaction.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      });

      const disputePct7d = total7d > 0 ? disputes7d / total7d : 0;

      // Calculate refund rate (30 days)
      const refunds30d = await this.prisma.transaction.count({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          status: 'REFUNDED',
        },
      });

      const total30d = await this.prisma.transaction.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      });

      const refundPct30d = total30d > 0 ? refunds30d / total30d : 0;

      return {
        pnlToday,
        pnlMtd,
        bankroll,
        cashToTrust: 0, // Will be calculated based on withdrawal rules
        flipsToday,
        avgProfitPerFlip,
        sellThroughHours,
        disputePct7d,
        refundPct30d,
      };
    } catch (error) {
      this.logger.error('Failed to get KPI summary', error);
      throw error;
    }
  }

  async getSystemStatus(): Promise<SystemStatus> {
    // This would check actual system health in production
    // For now, return mock healthy status
    return {
      hunter: 'green',
      buyer: 'green',
      merchant: 'green',
      fulfillment: 'green',
      collector: 'green',
      reprice: 'green',
      allocator: 'green',
      brains: 'green',
      governor: 'green',
    };
  }
}