import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DealCandidate, DealCandidateFilters, ApproveRuleRequest, PaginationParams } from '@yahuti/contracts';

@Injectable()
export class HuntService {
  private readonly logger = new Logger(HuntService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getCandidates(pagination: PaginationParams, filters: DealCandidateFilters) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const skip = (page - 1) * limit;

      const where: any = {
        status: 'PENDING',
      };

      // Apply filters
      if (filters.minNetMargin) {
        where.netMargin = { gte: filters.minNetMargin };
      }

      if (filters.minConfidence) {
        where.confidence = { gte: filters.minConfidence };
      }

      if (filters.minSellerScore) {
        where.sellerScore = { gte: filters.minSellerScore };
      }

      if (filters.categories?.length) {
        where.kind = { in: filters.categories };
      }

      if (filters.sources?.length) {
        where.source = { in: filters.sources };
      }

      const [candidates, total] = await Promise.all([
        this.prisma.dealCandidate.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { netMargin: 'desc' },
            { confidence: 'desc' },
            { discoveredAt: 'desc' },
          ],
        }),
        this.prisma.dealCandidate.count({ where }),
      ]);

      return {
        items: candidates.map(this.mapDealCandidate),
        total,
        page,
        limit,
        hasNext: skip + limit < total,
        hasPrev: page > 1,
      };
    } catch (error) {
      this.logger.error('Failed to get deal candidates', error);
      throw error;
    }
  }

  async approveRule(request: ApproveRuleRequest) {
    try {
      const { candidateIds, rule } = request;

      // If specific candidates provided, approve them
      if (candidateIds?.length) {
        await this.prisma.dealCandidate.updateMany({
          where: { id: { in: candidateIds } },
          data: { status: 'APPROVED', processedAt: new Date() },
        });
      }

      // Create or update auto-approval rule in playbook
      // This would be stored as YAML configuration
      this.logger.log('Auto-approval rule updated', rule);

      return { success: true, approvedCount: candidateIds?.length || 0 };
    } catch (error) {
      this.logger.error('Failed to approve rule', error);
      throw error;
    }
  }

  async getSupplierHeatmap() {
    try {
      // Get supplier performance over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const suppliers = await this.prisma.supplier.findMany({
        include: {
          inventory: {
            where: {
              createdAt: { gte: thirtyDaysAgo },
            },
            include: {
              transactions: true,
            },
          },
        },
      });

      const heatmap = suppliers.map(supplier => {
        const totalInventory = supplier.inventory.length;
        const soldItems = supplier.inventory.filter(inv => 
          inv.transactions.some(tx => tx.status === 'DELIVERED')
        ).length;
        
        const totalRevenue = supplier.inventory.reduce((sum, inv) => {
          const revenue = inv.transactions
            .filter(tx => tx.status === 'DELIVERED')
            .reduce((txSum, tx) => txSum + Number(tx.net), 0);
          return sum + revenue;
        }, 0);

        const avgMargin = totalInventory > 0 ? totalRevenue / totalInventory : 0;
        const sellThroughRate = totalInventory > 0 ? soldItems / totalInventory : 0;

        return {
          id: supplier.id,
          name: supplier.name,
          country: supplier.country,
          rating: supplier.rating,
          totalItems: totalInventory,
          soldItems,
          sellThroughRate,
          avgMargin,
          totalRevenue,
          roi: avgMargin > 0 ? totalRevenue / (totalInventory * avgMargin) : 0,
          blacklisted: supplier.blacklisted,
        };
      });

      return heatmap.sort((a, b) => b.roi - a.roi);
    } catch (error) {
      this.logger.error('Failed to get supplier heatmap', error);
      throw error;
    }
  }

  private mapDealCandidate(candidate: any): DealCandidate {
    return {
      id: candidate.id,
      source: candidate.source,
      sku: candidate.sku,
      kind: candidate.kind,
      cost: Number(candidate.cost),
      estimatedResale: Number(candidate.estimatedResale),
      estimatedFees: Number(candidate.estimatedFees),
      netMargin: candidate.netMargin,
      confidence: candidate.confidence,
      sellerScore: candidate.sellerScore,
      expectedSellThroughDays: candidate.expectedSellThroughDays,
      quantity: candidate.quantity,
      notes: candidate.notes,
      discoveredAt: candidate.discoveredAt.toISOString(),
    };
  }
}