import { Marketplace, InventoryKind, TxStatus } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('RiskMonitor');

export interface RiskMetrics {
  disputeRate7d: number;
  disputeRate30d: number;
  refundRate7d: number;
  refundRate30d: number;
  chargebackRate30d: number;
  avgDeliveryTime: number; // hours
  customerSatisfactionScore: number; // 1-5
  sellerPerformanceScore: number; // 0-100
  inventoryTurnoverRate: number; // times per month
  cashFlowRatio: number; // positive cash flow / total volume
}

export interface RiskThresholds {
  maxDisputeRate7d: number;
  maxDisputeRate30d: number;
  maxRefundRate7d: number;
  maxRefundRate30d: number;
  maxChargebackRate30d: number;
  maxAvgDeliveryTime: number;
  minCustomerSatisfactionScore: number;
  minSellerPerformanceScore: number;
  minCashFlowRatio: number;
}

export interface RiskAlert {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
  marketplace?: Marketplace;
  category?: InventoryKind;
  recommendedAction: string;
  timestamp: Date;
}

export interface MarketplaceRiskProfile {
  marketplace: Marketplace;
  riskScore: number; // 0-100, higher = more risky
  metrics: RiskMetrics;
  alerts: RiskAlert[];
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'SUSPENDED';
  lastUpdated: Date;
}

export interface CategoryRiskProfile {
  category: InventoryKind;
  riskScore: number;
  metrics: RiskMetrics;
  alerts: RiskAlert[];
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'SUSPENDED';
  lastUpdated: Date;
}

// Default risk thresholds
const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  maxDisputeRate7d: 0.05, // 5%
  maxDisputeRate30d: 0.03, // 3%
  maxRefundRate7d: 0.10, // 10%
  maxRefundRate30d: 0.08, // 8%
  maxChargebackRate30d: 0.01, // 1%
  maxAvgDeliveryTime: 24, // 24 hours
  minCustomerSatisfactionScore: 4.0, // out of 5
  minSellerPerformanceScore: 85, // out of 100
  minCashFlowRatio: 0.15, // 15% positive cash flow
};

// Marketplace-specific risk thresholds
const MARKETPLACE_RISK_THRESHOLDS: Partial<Record<Marketplace, Partial<RiskThresholds>>> = {
  EBAY: {
    maxDisputeRate30d: 0.02, // eBay is stricter
    maxRefundRate30d: 0.05,
    minSellerPerformanceScore: 90,
  },
  AMAZON: {
    maxDisputeRate30d: 0.015, // Amazon is very strict
    maxRefundRate30d: 0.04,
    minSellerPerformanceScore: 95,
    maxAvgDeliveryTime: 12, // Faster delivery expected
  },
  G2G: {
    maxDisputeRate30d: 0.08, // Gaming marketplaces are more tolerant
    maxRefundRate30d: 0.12,
    minSellerPerformanceScore: 75,
  },
  PLAYERAUCTIONS: {
    maxDisputeRate30d: 0.10,
    maxRefundRate30d: 0.15,
    minSellerPerformanceScore: 70,
  },
};

export class RiskMonitor {
  private static instance: RiskMonitor;
  private thresholds: RiskThresholds;
  private marketplaceProfiles: Map<Marketplace, MarketplaceRiskProfile> = new Map();
  private categoryProfiles: Map<InventoryKind, CategoryRiskProfile> = new Map();

  static getInstance(): RiskMonitor {
    if (!RiskMonitor.instance) {
      RiskMonitor.instance = new RiskMonitor();
    }
    return RiskMonitor.instance;
  }

  constructor(customThresholds?: Partial<RiskThresholds>) {
    this.thresholds = { ...DEFAULT_RISK_THRESHOLDS, ...customThresholds };
    logger.info('Risk monitor initialized', { thresholds: this.thresholds });
  }

  async calculateRiskMetrics(
    marketplace?: Marketplace,
    category?: InventoryKind,
    timeframe: '7d' | '30d' = '30d'
  ): Promise<RiskMetrics> {
    logger.debug('Calculating risk metrics', { marketplace, category, timeframe });

    // In a real implementation, these would query the database
    // For now, we'll generate realistic mock data
    const mockMetrics = this.generateMockRiskMetrics(marketplace, category);

    logger.debug('Risk metrics calculated', {
      marketplace,
      category,
      metrics: mockMetrics,
    });

    return mockMetrics;
  }

  async evaluateMarketplaceRisk(marketplace: Marketplace): Promise<MarketplaceRiskProfile> {
    logger.info(`Evaluating risk for marketplace ${marketplace}`);

    const metrics = await this.calculateRiskMetrics(marketplace);
    const thresholds = this.getMarketplaceThresholds(marketplace);
    const alerts = this.generateAlerts(metrics, thresholds, { marketplace });
    
    const riskScore = this.calculateRiskScore(metrics, thresholds);
    const status = this.determineStatus(riskScore, alerts);

    const profile: MarketplaceRiskProfile = {
      marketplace,
      riskScore,
      metrics,
      alerts,
      status,
      lastUpdated: new Date(),
    };

    this.marketplaceProfiles.set(marketplace, profile);

    logger.info(`Marketplace risk evaluation completed`, {
      marketplace,
      riskScore,
      status,
      alertCount: alerts.length,
    });

    return profile;
  }

  async evaluateCategoryRisk(category: InventoryKind): Promise<CategoryRiskProfile> {
    logger.info(`Evaluating risk for category ${category}`);

    const metrics = await this.calculateRiskMetrics(undefined, category);
    const alerts = this.generateAlerts(metrics, this.thresholds, { category });
    
    const riskScore = this.calculateRiskScore(metrics, this.thresholds);
    const status = this.determineStatus(riskScore, alerts);

    const profile: CategoryRiskProfile = {
      category,
      riskScore,
      metrics,
      alerts,
      status,
      lastUpdated: new Date(),
    };

    this.categoryProfiles.set(category, profile);

    logger.info(`Category risk evaluation completed`, {
      category,
      riskScore,
      status,
      alertCount: alerts.length,
    });

    return profile;
  }

  async evaluateOverallRisk(): Promise<{
    overallRiskScore: number;
    status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'SUSPENDED';
    criticalAlerts: RiskAlert[];
    recommendations: string[];
  }> {
    logger.info('Evaluating overall system risk');

    // Evaluate all marketplaces
    const marketplacePromises = Object.values(Marketplace).map(mp => 
      this.evaluateMarketplaceRisk(mp)
    );
    const marketplaceProfiles = await Promise.all(marketplacePromises);

    // Evaluate all categories
    const categoryPromises = Object.values(InventoryKind).map(cat => 
      this.evaluateCategoryRisk(cat)
    );
    const categoryProfiles = await Promise.all(categoryPromises);

    // Calculate weighted overall risk score
    const totalTransactions = 1000; // Mock value
    const overallRiskScore = marketplaceProfiles.reduce((sum, profile) => {
      const weight = this.getMarketplaceWeight(profile.marketplace, totalTransactions);
      return sum + (profile.riskScore * weight);
    }, 0);

    // Collect all critical alerts
    const criticalAlerts = [
      ...marketplaceProfiles.flatMap(p => p.alerts.filter(a => a.severity === 'CRITICAL')),
      ...categoryProfiles.flatMap(p => p.alerts.filter(a => a.severity === 'CRITICAL')),
    ];

    // Determine overall status
    const status = this.determineOverallStatus(overallRiskScore, criticalAlerts);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      marketplaceProfiles,
      categoryProfiles,
      overallRiskScore
    );

    logger.info('Overall risk evaluation completed', {
      overallRiskScore: Math.round(overallRiskScore),
      status,
      criticalAlertsCount: criticalAlerts.length,
      recommendationsCount: recommendations.length,
    });

    return {
      overallRiskScore: Math.round(overallRiskScore),
      status,
      criticalAlerts,
      recommendations,
    };
  }

  getMarketplaceProfile(marketplace: Marketplace): MarketplaceRiskProfile | undefined {
    return this.marketplaceProfiles.get(marketplace);
  }

  getCategoryProfile(category: InventoryKind): CategoryRiskProfile | undefined {
    return this.categoryProfiles.get(category);
  }

  shouldPauseTradingOn(marketplace: Marketplace): boolean {
    const profile = this.marketplaceProfiles.get(marketplace);
    return profile?.status === 'CRITICAL' || profile?.status === 'SUSPENDED';
  }

  shouldPauseCategory(category: InventoryKind): boolean {
    const profile = this.categoryProfiles.get(category);
    return profile?.status === 'CRITICAL' || profile?.status === 'SUSPENDED';
  }

  private generateMockRiskMetrics(
    marketplace?: Marketplace,
    category?: InventoryKind
  ): RiskMetrics {
    // Generate realistic mock metrics based on marketplace/category characteristics
    let baseDisputeRate = 0.02;
    let baseRefundRate = 0.06;
    let baseChargebackRate = 0.005;
    let baseDeliveryTime = 8;
    let baseSatisfactionScore = 4.2;
    let basePerformanceScore = 88;

    // Adjust based on marketplace
    if (marketplace) {
      switch (marketplace) {
        case 'AMAZON':
          baseDisputeRate *= 0.7; // Amazon has lower dispute rates
          baseRefundRate *= 0.8;
          baseDeliveryTime *= 0.6; // Faster delivery
          basePerformanceScore += 5;
          break;
        case 'EBAY':
          baseDisputeRate *= 0.9;
          baseRefundRate *= 1.1;
          basePerformanceScore += 2;
          break;
        case 'G2G':
        case 'PLAYERAUCTIONS':
          baseDisputeRate *= 1.5; // Gaming markets have more disputes
          baseRefundRate *= 1.3;
          baseSatisfactionScore *= 0.95;
          basePerformanceScore -= 5;
          break;
      }
    }

    // Adjust based on category
    if (category) {
      switch (category) {
        case 'ACCOUNT':
          baseDisputeRate *= 1.8; // Accounts have higher dispute rates
          baseRefundRate *= 1.4;
          baseSatisfactionScore *= 0.9;
          break;
        case 'KEY':
          baseDisputeRate *= 1.2;
          baseDeliveryTime *= 0.8; // Instant delivery
          break;
        case 'GIFTCARD':
          baseDisputeRate *= 0.8; // Lower risk
          baseSatisfactionScore *= 1.05;
          break;
        case 'DOMAIN':
          baseRefundRate *= 0.7; // Less refunds
          baseDeliveryTime *= 0.5; // Instant transfer
          break;
      }
    }

    // Add some randomness
    const randomFactor = 0.8 + Math.random() * 0.4; // 0.8 to 1.2

    return {
      disputeRate7d: Math.min(baseDisputeRate * randomFactor * 1.2, 0.2),
      disputeRate30d: Math.min(baseDisputeRate * randomFactor, 0.15),
      refundRate7d: Math.min(baseRefundRate * randomFactor * 1.1, 0.25),
      refundRate30d: Math.min(baseRefundRate * randomFactor, 0.2),
      chargebackRate30d: Math.min(baseChargebackRate * randomFactor, 0.05),
      avgDeliveryTime: baseDeliveryTime * randomFactor,
      customerSatisfactionScore: Math.min(baseSatisfactionScore * randomFactor, 5.0),
      sellerPerformanceScore: Math.min(basePerformanceScore * randomFactor, 100),
      inventoryTurnoverRate: 2.5 + Math.random() * 2, // 2.5-4.5x per month
      cashFlowRatio: 0.12 + Math.random() * 0.15, // 12-27%
    };
  }

  private getMarketplaceThresholds(marketplace: Marketplace): RiskThresholds {
    const marketplaceOverrides = MARKETPLACE_RISK_THRESHOLDS[marketplace] || {};
    return { ...this.thresholds, ...marketplaceOverrides };
  }

  private generateAlerts(
    metrics: RiskMetrics,
    thresholds: RiskThresholds,
    context: { marketplace?: Marketplace; category?: InventoryKind }
  ): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    // Check dispute rates
    if (metrics.disputeRate7d > thresholds.maxDisputeRate7d) {
      alerts.push({
        severity: metrics.disputeRate7d > thresholds.maxDisputeRate7d * 2 ? 'CRITICAL' : 'HIGH',
        metric: 'disputeRate7d',
        currentValue: metrics.disputeRate7d,
        threshold: thresholds.maxDisputeRate7d,
        message: `7-day dispute rate (${(metrics.disputeRate7d * 100).toFixed(1)}%) exceeds threshold (${(thresholds.maxDisputeRate7d * 100).toFixed(1)}%)`,
        marketplace: context.marketplace,
        category: context.category,
        recommendedAction: 'Review recent transactions and improve quality controls',
        timestamp: new Date(),
      });
    }

    if (metrics.disputeRate30d > thresholds.maxDisputeRate30d) {
      alerts.push({
        severity: metrics.disputeRate30d > thresholds.maxDisputeRate30d * 1.5 ? 'HIGH' : 'MEDIUM',
        metric: 'disputeRate30d',
        currentValue: metrics.disputeRate30d,
        threshold: thresholds.maxDisputeRate30d,
        message: `30-day dispute rate (${(metrics.disputeRate30d * 100).toFixed(1)}%) exceeds threshold (${(thresholds.maxDisputeRate30d * 100).toFixed(1)}%)`,
        marketplace: context.marketplace,
        category: context.category,
        recommendedAction: 'Investigate dispute patterns and improve supplier vetting',
        timestamp: new Date(),
      });
    }

    // Check refund rates
    if (metrics.refundRate30d > thresholds.maxRefundRate30d) {
      alerts.push({
        severity: metrics.refundRate30d > thresholds.maxRefundRate30d * 1.5 ? 'HIGH' : 'MEDIUM',
        metric: 'refundRate30d',
        currentValue: metrics.refundRate30d,
        threshold: thresholds.maxRefundRate30d,
        message: `30-day refund rate (${(metrics.refundRate30d * 100).toFixed(1)}%) exceeds threshold (${(thresholds.maxRefundRate30d * 100).toFixed(1)}%)`,
        marketplace: context.marketplace,
        category: context.category,
        recommendedAction: 'Review product quality and description accuracy',
        timestamp: new Date(),
      });
    }

    // Check chargeback rate
    if (metrics.chargebackRate30d > thresholds.maxChargebackRate30d) {
      alerts.push({
        severity: 'CRITICAL',
        metric: 'chargebackRate30d',
        currentValue: metrics.chargebackRate30d,
        threshold: thresholds.maxChargebackRate30d,
        message: `30-day chargeback rate (${(metrics.chargebackRate30d * 100).toFixed(1)}%) exceeds threshold (${(thresholds.maxChargebackRate30d * 100).toFixed(1)}%)`,
        marketplace: context.marketplace,
        category: context.category,
        recommendedAction: 'Immediate review required - risk of account suspension',
        timestamp: new Date(),
      });
    }

    // Check performance metrics
    if (metrics.sellerPerformanceScore < thresholds.minSellerPerformanceScore) {
      alerts.push({
        severity: metrics.sellerPerformanceScore < thresholds.minSellerPerformanceScore * 0.8 ? 'HIGH' : 'MEDIUM',
        metric: 'sellerPerformanceScore',
        currentValue: metrics.sellerPerformanceScore,
        threshold: thresholds.minSellerPerformanceScore,
        message: `Seller performance score (${metrics.sellerPerformanceScore.toFixed(1)}) below threshold (${thresholds.minSellerPerformanceScore})`,
        marketplace: context.marketplace,
        category: context.category,
        recommendedAction: 'Focus on improving delivery times and customer service',
        timestamp: new Date(),
      });
    }

    return alerts;
  }

  private calculateRiskScore(metrics: RiskMetrics, thresholds: RiskThresholds): number {
    let score = 0;
    let maxScore = 0;

    // Dispute rate component (0-25 points)
    const disputeRatio = metrics.disputeRate30d / thresholds.maxDisputeRate30d;
    score += Math.min(disputeRatio * 25, 25);
    maxScore += 25;

    // Refund rate component (0-20 points)
    const refundRatio = metrics.refundRate30d / thresholds.maxRefundRate30d;
    score += Math.min(refundRatio * 20, 20);
    maxScore += 20;

    // Chargeback rate component (0-30 points) - most critical
    const chargebackRatio = metrics.chargebackRate30d / thresholds.maxChargebackRate30d;
    score += Math.min(chargebackRatio * 30, 30);
    maxScore += 30;

    // Performance score component (0-15 points)
    const performanceDeficit = Math.max(0, thresholds.minSellerPerformanceScore - metrics.sellerPerformanceScore);
    score += (performanceDeficit / thresholds.minSellerPerformanceScore) * 15;
    maxScore += 15;

    // Delivery time component (0-10 points)
    const deliveryRatio = Math.max(0, metrics.avgDeliveryTime - thresholds.maxAvgDeliveryTime) / thresholds.maxAvgDeliveryTime;
    score += Math.min(deliveryRatio * 10, 10);
    maxScore += 10;

    return Math.round((score / maxScore) * 100);
  }

  private determineStatus(
    riskScore: number,
    alerts: RiskAlert[]
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'SUSPENDED' {
    const hasCriticalAlerts = alerts.some(a => a.severity === 'CRITICAL');
    
    if (hasCriticalAlerts || riskScore >= 80) {
      return 'CRITICAL';
    } else if (riskScore >= 60) {
      return 'WARNING';
    } else if (riskScore >= 40) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  private determineOverallStatus(
    overallRiskScore: number,
    criticalAlerts: RiskAlert[]
  ): 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'SUSPENDED' {
    if (criticalAlerts.length >= 3 || overallRiskScore >= 85) {
      return 'CRITICAL';
    } else if (criticalAlerts.length >= 1 || overallRiskScore >= 65) {
      return 'WARNING';
    } else {
      return 'HEALTHY';
    }
  }

  private getMarketplaceWeight(marketplace: Marketplace, totalTransactions: number): number {
    // Mock implementation - in reality would calculate based on actual transaction volumes
    const mockWeights = {
      EBAY: 0.35,
      AMAZON: 0.25,
      G2G: 0.15,
      PLAYERAUCTIONS: 0.10,
      GODADDY: 0.08,
      NAMECHEAP: 0.07,
    };
    return mockWeights[marketplace] || 0.1;
  }

  private generateRecommendations(
    marketplaceProfiles: MarketplaceRiskProfile[],
    categoryProfiles: CategoryRiskProfile[],
    overallRiskScore: number
  ): string[] {
    const recommendations: string[] = [];

    // Overall system recommendations
    if (overallRiskScore > 70) {
      recommendations.push('Consider reducing overall trading volume until risk metrics improve');
      recommendations.push('Implement enhanced quality control measures across all operations');
    }

    // Marketplace-specific recommendations
    marketplaceProfiles.forEach(profile => {
      if (profile.status === 'CRITICAL') {
        recommendations.push(`Suspend trading on ${profile.marketplace} until issues are resolved`);
      } else if (profile.status === 'WARNING') {
        recommendations.push(`Reduce trading volume on ${profile.marketplace} by 50%`);
      }
    });

    // Category-specific recommendations
    categoryProfiles.forEach(profile => {
      if (profile.status === 'CRITICAL') {
        recommendations.push(`Suspend ${profile.category} trading until quality issues are addressed`);
      } else if (profile.riskScore > 60) {
        recommendations.push(`Increase vetting standards for ${profile.category} suppliers`);
      }
    });

    // Generic recommendations based on common issues
    recommendations.push('Review and update supplier vetting criteria');
    recommendations.push('Implement customer feedback analysis automation');
    recommendations.push('Consider diversifying into lower-risk product categories');

    return [...new Set(recommendations)]; // Remove duplicates
  }
}