import { Job } from 'bullmq';
import { prisma, InventoryKind, Marketplace } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('Allocator');

export interface AllocatorJobData {
  totalBudget?: number;
  rebalance?: boolean;
  includeCategories?: InventoryKind[];
  excludeCategories?: InventoryKind[];
  timeHorizon?: number; // days
  dryRun?: boolean;
}

export interface AllocationStrategy {
  name: string;
  description: string;
  riskProfile: 'conservative' | 'balanced' | 'aggressive';
  diversificationLevel: 'low' | 'medium' | 'high';
  rebalanceFrequency: number; // days
}

export interface CategoryPerformance {
  category: InventoryKind;
  roi30d: number;
  roi90d: number;
  successRate: number;
  avgSellThroughDays: number;
  totalVolume: number;
  profitMargin: number;
  riskScore: number;
  trend: 'growing' | 'stable' | 'declining';
}

export interface AllocationPlan {
  category: InventoryKind;
  currentAllocation: number; // dollar amount
  targetAllocation: number; // dollar amount
  allocationPercent: number; // percentage of total budget
  expectedRoi: number;
  riskAdjustedReturn: number;
  reasoning: string[];
  priority: number; // 1-10, higher = more priority
}

export interface AllocationResult {
  totalBudget: number;
  allocations: AllocationPlan[];
  expectedPortfolioRoi: number;
  portfolioRiskScore: number;
  diversificationScore: number;
  recommendations: string[];
}

const ALLOCATION_STRATEGIES: Record<string, AllocationStrategy> = {
  conservative: {
    name: 'Conservative Growth',
    description: 'Focus on stable, low-risk categories with consistent returns',
    riskProfile: 'conservative',
    diversificationLevel: 'high',
    rebalanceFrequency: 14,
  },
  balanced: {
    name: 'Balanced Portfolio',
    description: 'Mix of growth and stability across multiple categories',
    riskProfile: 'balanced',
    diversificationLevel: 'medium',
    rebalanceFrequency: 10,
  },
  aggressive: {
    name: 'Growth Focused',
    description: 'Concentrate on high-return opportunities with higher risk tolerance',
    riskProfile: 'aggressive',
    diversificationLevel: 'low',
    rebalanceFrequency: 7,
  },
};

export async function allocatorJob(job: Job<AllocatorJobData>) {
  const {
    totalBudget = 10000,
    rebalance = false,
    includeCategories,
    excludeCategories = [],
    timeHorizon = 30,
    dryRun = false
  } = job.data;

  logger.info('Starting budget allocation job', {
    totalBudget,
    rebalance,
    includeCategories,
    excludeCategories,
    timeHorizon,
    dryRun,
  });

  try {
    // Get current portfolio state
    const currentAllocations = await getCurrentAllocations();
    const availableBudget = await getAvailableBudget(totalBudget);

    logger.info('Current portfolio state', {
      currentAllocations: currentAllocations.length,
      availableBudget,
      totalBudget,
    });

    // Update job progress
    await job.updateProgress(10);

    // Analyze category performance
    const categoryPerformances = await analyzeCategoryPerformance(timeHorizon);
    
    // Filter categories based on include/exclude lists
    const eligibleCategories = categoryPerformances.filter(cat => {
      if (includeCategories && !includeCategories.includes(cat.category)) {
        return false;
      }
      if (excludeCategories.includes(cat.category)) {
        return false;
      }
      return true;
    });

    logger.info(`Analyzing ${eligibleCategories.length} eligible categories`);

    // Update job progress
    await job.updateProgress(30);

    // Generate allocation strategy
    const strategy = determineOptimalStrategy(eligibleCategories, totalBudget);
    const allocationPlan = generateAllocationPlan(
      eligibleCategories,
      currentAllocations,
      availableBudget,
      strategy
    );

    logger.info('Generated allocation plan', {
      strategy: strategy.name,
      allocations: allocationPlan.allocations.length,
      expectedRoi: allocationPlan.expectedPortfolioRoi,
    });

    // Update job progress
    await job.updateProgress(60);

    // Execute allocations if not dry run
    let executionResults = [];
    if (!dryRun) {
      executionResults = await executeAllocationPlan(allocationPlan, rebalance);
      logger.info(`Executed ${executionResults.length} allocation changes`);
    } else {
      logger.info('[DRY RUN] Allocation plan generated but not executed');
    }

    // Update job progress
    await job.updateProgress(80);

    // Log allocation activity
    await prisma.ledger.create({
      data: {
        event: 'allocator.rebalance_completed',
        payloadJson: {
          strategy: strategy.name,
          totalBudget,
          availableBudget,
          allocations: allocationPlan.allocations.map(a => ({
            category: a.category,
            targetAllocation: a.targetAllocation,
            allocationPercent: a.allocationPercent,
            expectedRoi: a.expectedRoi,
          })),
          expectedPortfolioRoi: allocationPlan.expectedPortfolioRoi,
          portfolioRiskScore: allocationPlan.portfolioRiskScore,
          diversificationScore: allocationPlan.diversificationScore,
          rebalance,
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'allocator',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      strategy: strategy.name,
      totalBudget,
      availableBudget,
      allocationPlan,
      executionResults: executionResults.length,
      dryRun,
    };

    logger.info('Budget allocation completed', result);
    return result;

  } catch (error) {
    logger.error('Allocator job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'allocator.job_failed',
        payloadJson: {
          totalBudget,
          rebalance,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'allocator',
      },
    });

    throw error;
  }
}

async function getCurrentAllocations(): Promise<Array<{
  category: InventoryKind;
  currentValue: number;
  itemCount: number;
}>> {
  // Get current inventory value by category
  const inventoryByCategory = await prisma.inventory.groupBy({
    by: ['kind'],
    where: { status: 'AVAILABLE' },
    _sum: { cost: true },
    _count: true,
  });

  return inventoryByCategory.map(item => ({
    category: item.kind,
    currentValue: Number(item._sum.cost) || 0,
    itemCount: item._count,
  }));
}

async function getAvailableBudget(totalBudget: number): Promise<number> {
  // Calculate how much budget is currently tied up in inventory
  const inventoryValue = await prisma.inventory.aggregate({
    where: { status: { in: ['AVAILABLE', 'RESERVED'] } },
    _sum: { cost: true },
  });

  const currentlyInvested = Number(inventoryValue._sum.cost) || 0;
  const availableBudget = Math.max(0, totalBudget - currentlyInvested);

  logger.info('Budget analysis', {
    totalBudget,
    currentlyInvested,
    availableBudget,
    utilizationRate: currentlyInvested / totalBudget,
  });

  return availableBudget;
}

async function analyzeCategoryPerformance(timeHorizonDays: number): Promise<CategoryPerformance[]> {
  logger.info(`Analyzing category performance over ${timeHorizonDays} days`);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeHorizonDays);

  const performances: CategoryPerformance[] = [];

  for (const category of Object.values(InventoryKind)) {
    // Get sold transactions for this category
    const soldTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'DELIVERED',
        inventory: { kind: category },
      },
      include: { inventory: true },
    });

    if (soldTransactions.length === 0) {
      // No data for this category, use default estimates
      performances.push({
        category,
        roi30d: getDefaultRoi(category),
        roi90d: getDefaultRoi(category) * 0.8,
        successRate: 0.5,
        avgSellThroughDays: getDefaultSellThroughDays(category),
        totalVolume: 0,
        profitMargin: getDefaultMargin(category),
        riskScore: getDefaultRiskScore(category),
        trend: 'stable',
      });
      continue;
    }

    // Calculate metrics
    let totalCost = 0;
    let totalRevenue = 0;
    let totalSellThroughDays = 0;

    for (const tx of soldTransactions) {
      totalCost += Number(tx.inventory.cost);
      totalRevenue += Number(tx.net); // Use net amount after fees
      
      // Calculate sell-through time
      const sellThroughDays = (tx.createdAt.getTime() - tx.inventory.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      totalSellThroughDays += sellThroughDays;
    }

    const roi30d = totalCost > 0 ? ((totalRevenue - totalCost) / totalCost) * 100 : 0;
    const avgSellThroughDays = totalSellThroughDays / soldTransactions.length;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0;

    // Calculate success rate (sold vs total purchased in category)
    const totalPurchased = await prisma.inventory.count({
      where: {
        kind: category,
        createdAt: { gte: startDate },
      },
    });

    const successRate = totalPurchased > 0 ? soldTransactions.length / totalPurchased : 0;

    // Determine trend (compare recent vs older performance)
    const midPoint = new Date(startDate.getTime() + (Date.now() - startDate.getTime()) / 2);
    const recentSales = soldTransactions.filter(tx => tx.createdAt >= midPoint);
    const olderSales = soldTransactions.filter(tx => tx.createdAt < midPoint);

    let trend: 'growing' | 'stable' | 'declining' = 'stable';
    if (recentSales.length > olderSales.length * 1.2) {
      trend = 'growing';
    } else if (recentSales.length < olderSales.length * 0.8) {
      trend = 'declining';
    }

    performances.push({
      category,
      roi30d,
      roi90d: roi30d * 0.85, // Estimate based on 30d performance
      successRate,
      avgSellThroughDays,
      totalVolume: totalRevenue,
      profitMargin,
      riskScore: calculateCategoryRiskScore(category, successRate, avgSellThroughDays),
      trend,
    });

    logger.debug(`Category ${category} performance`, {
      roi30d,
      successRate,
      avgSellThroughDays,
      totalVolume: totalRevenue,
      trend,
    });
  }

  return performances;
}

function determineOptimalStrategy(
  categoryPerformances: CategoryPerformance[],
  totalBudget: number
): AllocationStrategy {
  // Analyze overall portfolio characteristics
  const avgRoi = categoryPerformances.reduce((sum, cat) => sum + cat.roi30d, 0) / categoryPerformances.length;
  const avgRiskScore = categoryPerformances.reduce((sum, cat) => sum + cat.riskScore, 0) / categoryPerformances.length;
  const highPerformingCategories = categoryPerformances.filter(cat => cat.roi30d > avgRoi * 1.2).length;

  logger.info('Portfolio analysis for strategy selection', {
    avgRoi,
    avgRiskScore,
    highPerformingCategories,
    totalCategories: categoryPerformances.length,
  });

  // Select strategy based on portfolio characteristics and budget size
  if (totalBudget < 5000 || avgRiskScore > 70) {
    return ALLOCATION_STRATEGIES.conservative;
  } else if (totalBudget > 25000 && highPerformingCategories >= 2 && avgRoi > 15) {
    return ALLOCATION_STRATEGIES.aggressive;
  } else {
    return ALLOCATION_STRATEGIES.balanced;
  }
}

function generateAllocationPlan(
  categoryPerformances: CategoryPerformance[],
  currentAllocations: Array<{ category: InventoryKind; currentValue: number; itemCount: number }>,
  availableBudget: number,
  strategy: AllocationStrategy
): AllocationResult {
  logger.info(`Generating allocation plan using ${strategy.name} strategy`);

  // Sort categories by risk-adjusted return
  const sortedCategories = categoryPerformances
    .map(cat => ({
      ...cat,
      riskAdjustedReturn: cat.roi30d / Math.max(cat.riskScore, 10), // Avoid division by zero
      sharpeRatio: cat.profitMargin / Math.max(cat.riskScore, 10),
    }))
    .sort((a, b) => b.riskAdjustedReturn - a.riskAdjustedReturn);

  const allocations: AllocationPlan[] = [];
  let totalTargetAllocation = 0;

  // Generate allocations based on strategy
  for (let i = 0; i < sortedCategories.length; i++) {
    const cat = sortedCategories[i];
    const currentAllocation = currentAllocations.find(a => a.category === cat.category)?.currentValue || 0;
    
    let allocationPercent: number;
    let priority: number;

    switch (strategy.riskProfile) {
      case 'conservative':
        // Even distribution with slight preference for low-risk categories
        allocationPercent = Math.max(5, 30 - cat.riskScore * 0.3);
        priority = 10 - Math.floor(cat.riskScore / 10);
        break;

      case 'aggressive':
        // Concentrate on top performers
        if (i < 2) {
          allocationPercent = 40 - i * 10; // 40%, 30% for top 2
        } else if (i < 4) {
          allocationPercent = 15; // 15% for next 2
        } else {
          allocationPercent = Math.max(5, (100 - 110) / Math.max(sortedCategories.length - 4, 1));
        }
        priority = Math.max(1, 10 - i);
        break;

      case 'balanced':
      default:
        // Weighted allocation based on performance
        if (i < 3) {
          allocationPercent = 25 - i * 5; // 25%, 20%, 15% for top 3
        } else {
          allocationPercent = Math.max(5, (100 - 60) / Math.max(sortedCategories.length - 3, 1));
        }
        priority = Math.max(1, 10 - Math.floor(i * 2));
        break;
    }

    // Adjust for diversification requirements
    if (strategy.diversificationLevel === 'high') {
      allocationPercent = Math.min(allocationPercent, 25); // Max 25% in any category
    } else if (strategy.diversificationLevel === 'low') {
      allocationPercent = Math.min(allocationPercent, 60); // Max 60% in any category
    } else {
      allocationPercent = Math.min(allocationPercent, 35); // Max 35% in any category
    }

    const targetAllocation = (availableBudget + currentAllocation) * (allocationPercent / 100);
    totalTargetAllocation += targetAllocation;

    const reasoning = [];
    reasoning.push(`${allocationPercent.toFixed(1)}% allocation based on ${strategy.name} strategy`);
    
    if (cat.riskAdjustedReturn > 2) {
      reasoning.push('High risk-adjusted return');
    }
    if (cat.trend === 'growing') {
      reasoning.push('Positive growth trend');
    } else if (cat.trend === 'declining') {
      reasoning.push('Declining trend - reduced allocation');
    }
    if (cat.successRate > 0.8) {
      reasoning.push('High success rate');
    }

    allocations.push({
      category: cat.category,
      currentAllocation,
      targetAllocation,
      allocationPercent,
      expectedRoi: cat.roi30d,
      riskAdjustedReturn: cat.riskAdjustedReturn,
      reasoning,
      priority,
    });
  }

  // Normalize allocations to ensure they sum to 100%
  const totalPercent = allocations.reduce((sum, a) => sum + a.allocationPercent, 0);
  if (totalPercent !== 100) {
    const adjustmentFactor = 100 / totalPercent;
    allocations.forEach(a => {
      a.allocationPercent *= adjustmentFactor;
      a.targetAllocation *= adjustmentFactor;
    });
  }

  // Calculate portfolio metrics
  const expectedPortfolioRoi = allocations.reduce(
    (sum, a) => sum + (a.expectedRoi * a.allocationPercent / 100), 0
  );

  const portfolioRiskScore = allocations.reduce(
    (sum, a) => {
      const cat = sortedCategories.find(c => c.category === a.category)!;
      return sum + (cat.riskScore * a.allocationPercent / 100);
    }, 0
  );

  // Calculate diversification score (higher is better)
  const diversificationScore = Math.min(100, allocations.length * 20 - 
    Math.max(...allocations.map(a => a.allocationPercent)) * 2);

  // Generate recommendations
  const recommendations = generateRecommendations(allocations, strategy, categoryPerformances);

  return {
    totalBudget: availableBudget + currentAllocations.reduce((sum, a) => sum + a.currentValue, 0),
    allocations: allocations.sort((a, b) => b.priority - a.priority),
    expectedPortfolioRoi,
    portfolioRiskScore,
    diversificationScore,
    recommendations,
  };
}

async function executeAllocationPlan(
  allocationPlan: AllocationResult,
  rebalance: boolean
): Promise<Array<{ category: InventoryKind; action: string; amount: number }>> {
  const executionResults = [];

  for (const allocation of allocationPlan.allocations) {
    const difference = allocation.targetAllocation - allocation.currentAllocation;
    
    if (Math.abs(difference) < 100) {
      // Skip small adjustments
      continue;
    }

    let action: string;
    let amount: number;

    if (difference > 0) {
      // Need to increase allocation
      action = 'increase_budget';
      amount = difference;
    } else {
      // Need to decrease allocation (if rebalancing enabled)
      if (!rebalance) {
        continue; // Skip reductions if not rebalancing
      }
      action = 'decrease_budget';
      amount = Math.abs(difference);
    }

    // In reality, this would update budget limits for buyers/hunters
    // For now, just log the intended action
    logger.info(`Executing allocation change`, {
      category: allocation.category,
      action,
      amount,
      currentAllocation: allocation.currentAllocation,
      targetAllocation: allocation.targetAllocation,
    });

    executionResults.push({
      category: allocation.category,
      action,
      amount,
    });

    // Add small delay between executions
    await delay(100);
  }

  return executionResults;
}

function generateRecommendations(
  allocations: AllocationPlan[],
  strategy: AllocationStrategy,
  categoryPerformances: CategoryPerformance[]
): string[] {
  const recommendations: string[] = [];

  // Strategy-specific recommendations
  recommendations.push(`Using ${strategy.name} strategy - ${strategy.description}`);
  recommendations.push(`Rebalance frequency: Every ${strategy.rebalanceFrequency} days`);

  // Top performing categories
  const topPerformer = allocations.sort((a, b) => b.expectedRoi - a.expectedRoi)[0];
  if (topPerformer) {
    recommendations.push(`${topPerformer.category} shows strongest performance with ${topPerformer.expectedRoi.toFixed(1)}% ROI`);
  }

  // Risk management
  const highRiskCategories = allocations.filter(a => {
    const cat = categoryPerformances.find(c => c.category === a.category);
    return cat && cat.riskScore > 70;
  });

  if (highRiskCategories.length > 0) {
    recommendations.push(`Monitor high-risk categories: ${highRiskCategories.map(a => a.category).join(', ')}`);
  }

  // Diversification advice
  const maxAllocation = Math.max(...allocations.map(a => a.allocationPercent));
  if (maxAllocation > 40) {
    recommendations.push('Consider reducing concentration risk by diversifying across more categories');
  }

  // Trend-based recommendations
  const decliningCategories = categoryPerformances.filter(cat => cat.trend === 'declining');
  if (decliningCategories.length > 0) {
    recommendations.push(`Watch declining categories: ${decliningCategories.map(c => c.category).join(', ')}`);
  }

  const growingCategories = categoryPerformances.filter(cat => cat.trend === 'growing');
  if (growingCategories.length > 0) {
    recommendations.push(`Consider increasing exposure to growing categories: ${growingCategories.map(c => c.category).join(', ')}`);
  }

  return recommendations;
}

// Helper functions for default values when no historical data exists
function getDefaultRoi(category: InventoryKind): number {
  const defaultRois = {
    'KEY': 25,
    'ACCOUNT': 45,
    'DOMAIN': 80,
    'GIFTCARD': 15,
    'SUBSCRIPTION': 35,
  };
  return defaultRois[category] || 20;
}

function getDefaultSellThroughDays(category: InventoryKind): number {
  const defaultDays = {
    'KEY': 3,
    'ACCOUNT': 7,
    'DOMAIN': 21,
    'GIFTCARD': 2,
    'SUBSCRIPTION': 5,
  };
  return defaultDays[category] || 7;
}

function getDefaultMargin(category: InventoryKind): number {
  const defaultMargins = {
    'KEY': 35,
    'ACCOUNT': 50,
    'DOMAIN': 70,
    'GIFTCARD': 20,
    'SUBSCRIPTION': 40,
  };
  return defaultMargins[category] || 35;
}

function getDefaultRiskScore(category: InventoryKind): number {
  const defaultRiskScores = {
    'KEY': 30,
    'ACCOUNT': 65,
    'DOMAIN': 45,
    'GIFTCARD': 20,
    'SUBSCRIPTION': 40,
  };
  return defaultRiskScores[category] || 40;
}

function calculateCategoryRiskScore(
  category: InventoryKind,
  successRate: number,
  avgSellThroughDays: number
): number {
  let baseRisk = getDefaultRiskScore(category);
  
  // Adjust based on actual performance
  if (successRate < 0.5) {
    baseRisk += 20; // Low success rate increases risk
  } else if (successRate > 0.8) {
    baseRisk -= 15; // High success rate reduces risk
  }
  
  if (avgSellThroughDays > 14) {
    baseRisk += 10; // Slow sell-through increases risk
  } else if (avgSellThroughDays < 5) {
    baseRisk -= 10; // Fast sell-through reduces risk
  }
  
  return Math.max(10, Math.min(100, baseRisk));
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get allocation statistics
export async function getAllocationStats(): Promise<{
  totalBudgetUtilized: number;
  topAllocatedCategory: InventoryKind;
  diversificationScore: number;
  portfolioRoi: number;
  lastRebalanceDate: Date | null;
}> {
  const currentAllocations = await getCurrentAllocations();
  const totalBudgetUtilized = currentAllocations.reduce((sum, a) => sum + a.currentValue, 0);
  
  const topAllocatedCategory = currentAllocations
    .sort((a, b) => b.currentValue - a.currentValue)[0]?.category || 'KEY';

  // Get last rebalance
  const lastRebalance = await prisma.ledger.findFirst({
    where: { event: 'allocator.rebalance_completed' },
    orderBy: { ts: 'desc' },
  });

  return {
    totalBudgetUtilized,
    topAllocatedCategory,
    diversificationScore: Math.min(100, currentAllocations.length * 25),
    portfolioRoi: 23.5, // Mock value
    lastRebalanceDate: lastRebalance?.ts || null,
  };
}

// Function to suggest rebalancing opportunities
export async function suggestRebalancing(): Promise<{
  needsRebalancing: boolean;
  daysSinceLastRebalance: number;
  imbalances: Array<{ category: InventoryKind; currentPercent: number; recommendedPercent: number }>;
  potentialImpact: string;
}> {
  const lastRebalance = await prisma.ledger.findFirst({
    where: { event: 'allocator.rebalance_completed' },
    orderBy: { ts: 'desc' },
  });

  const daysSinceLastRebalance = lastRebalance ? 
    Math.floor((Date.now() - lastRebalance.ts.getTime()) / (24 * 60 * 60 * 1000)) : 999;

  const currentAllocations = await getCurrentAllocations();
  const totalValue = currentAllocations.reduce((sum, a) => sum + a.currentValue, 0);

  const imbalances = currentAllocations
    .filter(a => a.currentValue > 0)
    .map(a => {
      const currentPercent = (a.currentValue / totalValue) * 100;
      const recommendedPercent = getRecommendedAllocation(a.category);
      return {
        category: a.category,
        currentPercent,
        recommendedPercent,
        deviation: Math.abs(currentPercent - recommendedPercent),
      };
    })
    .filter(i => i.deviation > 5) // Only significant imbalances
    .sort((a, b) => b.deviation - a.deviation);

  const needsRebalancing = daysSinceLastRebalance > 14 || imbalances.length > 0;

  return {
    needsRebalancing,
    daysSinceLastRebalance,
    imbalances: imbalances.map(i => ({
      category: i.category,
      currentPercent: Math.round(i.currentPercent * 10) / 10,
      recommendedPercent: i.recommendedPercent,
    })),
    potentialImpact: imbalances.length > 0 ? 
      `Rebalancing could improve portfolio efficiency by ${Math.round(imbalances[0].deviation)}%` :
      'Portfolio is well-balanced',
  };
}

function getRecommendedAllocation(category: InventoryKind): number {
  // Default balanced allocation percentages
  const recommendations = {
    'KEY': 25,
    'ACCOUNT': 20,
    'DOMAIN': 15,
    'GIFTCARD': 25,
    'SUBSCRIPTION': 15,
  };
  return recommendations[category] || 20;
}