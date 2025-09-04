import { Job } from 'bullmq';
import { prisma, DealCandidateStatus, InventoryStatus, DeliveryPolicy } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('Buyer');

export interface BuyerJobData {
  candidateId?: string;
  batchSize?: number;
  maxSpendAmount?: number;
  dryRun?: boolean;
}

export interface PurchaseResult {
  success: boolean;
  orderId?: string;
  actualCost?: number;
  deliveryInfo?: {
    method: 'instant' | 'email' | 'api' | 'manual';
    expectedDeliveryTime: number; // hours
    trackingInfo?: string;
  };
  inventoryId?: string;
  error?: string;
}

export interface SourceClient {
  name: string;
  baseUrl: string;
  authenticateAndPurchase(sku: string, quantity: number, cost: number): Promise<PurchaseResult>;
  checkAvailability(sku: string): Promise<{ available: boolean; quantity: number; currentPrice: number }>;
  getDeliveryStatus(orderId: string): Promise<{ status: string; deliveryData?: any }>;
}

// Mock source clients - in reality these would integrate with actual APIs
const SOURCE_CLIENTS: Record<string, SourceClient> = {
  G2A: {
    name: 'G2A',
    baseUrl: 'https://api.g2a.com',
    async authenticateAndPurchase(sku, quantity, cost) {
      // Mock G2A purchase
      await delay(1000 + Math.random() * 2000);
      
      if (Math.random() < 0.05) {
        throw new Error('Payment failed - insufficient balance');
      }
      
      if (Math.random() < 0.03) {
        throw new Error('Item no longer available');
      }

      return {
        success: true,
        orderId: `G2A_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actualCost: cost * (0.98 + Math.random() * 0.04), // Small price variance
        deliveryInfo: {
          method: 'instant',
          expectedDeliveryTime: 0.5,
          trackingInfo: `G2A-${Date.now()}`,
        },
      };
    },
    async checkAvailability(sku) {
      await delay(200 + Math.random() * 300);
      return {
        available: Math.random() > 0.1,
        quantity: Math.floor(Math.random() * 10) + 1,
        currentPrice: 10 + Math.random() * 40,
      };
    },
    async getDeliveryStatus(orderId) {
      await delay(100 + Math.random() * 200);
      return {
        status: 'delivered',
        deliveryData: {
          keys: [`XXXXX-XXXXX-XXXXX-${Math.random().toString(36).substr(2, 5).toUpperCase()}`],
          instructions: 'Activate on Steam',
        },
      };
    },
  },
  KINGUIN: {
    name: 'Kinguin',
    baseUrl: 'https://api.kinguin.net',
    async authenticateAndPurchase(sku, quantity, cost) {
      await delay(800 + Math.random() * 1500);
      
      if (Math.random() < 0.04) {
        throw new Error('Authentication failed');
      }

      return {
        success: true,
        orderId: `KIN_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actualCost: cost * (0.99 + Math.random() * 0.02),
        deliveryInfo: {
          method: 'email',
          expectedDeliveryTime: 2,
          trackingInfo: `KINGUIN-${Date.now()}`,
        },
      };
    },
    async checkAvailability(sku) {
      await delay(150 + Math.random() * 250);
      return {
        available: Math.random() > 0.08,
        quantity: Math.floor(Math.random() * 15) + 1,
        currentPrice: 8 + Math.random() * 35,
      };
    },
    async getDeliveryStatus(orderId) {
      await delay(80 + Math.random() * 150);
      return {
        status: 'processing',
        deliveryData: null,
      };
    },
  },
  CDKEYS: {
    name: 'CDKeys',
    baseUrl: 'https://api.cdkeys.com',
    async authenticateAndPurchase(sku, quantity, cost) {
      await delay(1200 + Math.random() * 1800);
      
      if (Math.random() < 0.06) {
        throw new Error('Stock temporarily unavailable');
      }

      return {
        success: true,
        orderId: `CDK_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        actualCost: cost,
        deliveryInfo: {
          method: 'manual',
          expectedDeliveryTime: 24,
          trackingInfo: `CDK-${Date.now()}`,
        },
      };
    },
    async checkAvailability(sku) {
      await delay(300 + Math.random() * 500);
      return {
        available: Math.random() > 0.15,
        quantity: Math.floor(Math.random() * 5) + 1,
        currentPrice: 12 + Math.random() * 28,
      };
    },
    async getDeliveryStatus(orderId) {
      await delay(120 + Math.random() * 180);
      return {
        status: 'pending_manual_review',
        deliveryData: null,
      };
    },
  },
};

export async function buyerJob(job: Job<BuyerJobData>) {
  const {
    candidateId,
    batchSize = 10,
    maxSpendAmount = 1000,
    dryRun = false
  } = job.data;

  logger.info('Starting purchase execution', {
    candidateId,
    batchSize,
    maxSpendAmount,
    dryRun,
  });

  try {
    let candidates;
    let totalCandidates;

    if (candidateId) {
      // Purchase specific candidate
      const candidate = await prisma.dealCandidate.findUnique({
        where: { 
          id: candidateId,
          status: 'APPROVED',
        },
      });

      if (!candidate) {
        throw new Error(`Approved candidate ${candidateId} not found`);
      }

      candidates = [candidate];
      totalCandidates = 1;
    } else {
      // Purchase batch of approved candidates
      candidates = await prisma.dealCandidate.findMany({
        where: {
          status: 'APPROVED',
        },
        take: batchSize,
        orderBy: [
          { netMargin: 'desc' },
          { discoveredAt: 'asc' }, // FIFO for same margin
        ],
      });
      totalCandidates = candidates.length;
    }

    if (candidates.length === 0) {
      logger.info('No approved candidates to purchase');
      return {
        success: true,
        totalCandidates: 0,
        attempted: 0,
        purchased: 0,
        failed: 0,
        totalSpent: 0,
        dryRun,
      };
    }

    logger.info(`Found ${candidates.length} candidates to purchase`);

    // Filter candidates by budget
    let remainingBudget = maxSpendAmount;
    const affordableCandidates = [];
    
    for (const candidate of candidates) {
      const cost = Number(candidate.cost);
      if (cost <= remainingBudget) {
        affordableCandidates.push(candidate);
        remainingBudget -= cost;
      } else {
        logger.debug(`Skipping candidate ${candidate.sku} - exceeds remaining budget`, {
          cost,
          remainingBudget,
        });
      }
    }

    logger.info(`${affordableCandidates.length}/${candidates.length} candidates within budget`);

    // Update job progress
    await job.updateProgress(10);

    const purchaseResults = [];
    let purchasedCount = 0;
    let failedCount = 0;
    let totalSpent = 0;

    for (let i = 0; i < affordableCandidates.length; i++) {
      const candidate = affordableCandidates[i];
      
      logger.info(`Purchasing candidate ${candidate.sku}`, {
        source: candidate.source,
        cost: candidate.cost,
        quantity: candidate.quantity,
      });

      try {
        // Get source client
        const sourceClient = SOURCE_CLIENTS[candidate.source.toUpperCase()];
        if (!sourceClient) {
          throw new Error(`No client configured for source: ${candidate.source}`);
        }

        // Check availability before purchase
        const availability = await sourceClient.checkAvailability(candidate.sku);
        if (!availability.available) {
          throw new Error('Item no longer available');
        }

        if (availability.quantity < candidate.quantity) {
          throw new Error(`Insufficient quantity: ${availability.quantity} available, ${candidate.quantity} needed`);
        }

        // Check for price changes
        const currentPrice = availability.currentPrice;
        const expectedPrice = Number(candidate.cost);
        const priceVariance = Math.abs(currentPrice - expectedPrice) / expectedPrice;

        if (priceVariance > 0.10) { // 10% price change threshold
          throw new Error(`Price changed significantly: expected $${expectedPrice.toFixed(2)}, current $${currentPrice.toFixed(2)}`);
        }

        let purchaseResult: PurchaseResult;
        
        if (!dryRun) {
          // Execute actual purchase
          purchaseResult = await sourceClient.authenticateAndPurchase(
            candidate.sku,
            candidate.quantity,
            Number(candidate.cost)
          );

          if (!purchaseResult.success) {
            throw new Error(purchaseResult.error || 'Purchase failed');
          }

          // Create inventory record
          const inventory = await prisma.inventory.create({
            data: {
              sku: candidate.sku,
              kind: candidate.kind,
              cost: purchaseResult.actualCost || Number(candidate.cost),
              provenance: JSON.stringify({
                source: candidate.source,
                orderId: purchaseResult.orderId,
                purchasedAt: new Date().toISOString(),
                trackingInfo: purchaseResult.deliveryInfo?.trackingInfo,
              }),
              policy: purchaseResult.deliveryInfo?.method === 'instant' ? 'INSTANT' : 'ESCROW',
              status: 'AVAILABLE',
            },
          });

          // Update candidate status
          await prisma.dealCandidate.update({
            where: { id: candidate.id },
            data: {
              status: 'PURCHASED',
              processedAt: new Date(),
            },
          });

          purchaseResult.inventoryId = inventory.id;
          totalSpent += purchaseResult.actualCost || Number(candidate.cost);
          
        } else {
          // Dry run - simulate purchase
          purchaseResult = {
            success: true,
            orderId: `DRY_RUN_${Date.now()}`,
            actualCost: Number(candidate.cost),
            deliveryInfo: {
              method: 'instant',
              expectedDeliveryTime: 1,
            },
          };
        }

        purchaseResults.push({
          candidate,
          result: purchaseResult,
        });

        purchasedCount++;
        
        logger.info(`Successfully purchased ${candidate.sku}`, {
          orderId: purchaseResult.orderId,
          actualCost: purchaseResult.actualCost,
          inventoryId: purchaseResult.inventoryId,
        });

        // Update progress
        const progress = 10 + ((i + 1) / affordableCandidates.length) * 85;
        await job.updateProgress(Math.round(progress));

        // Small delay between purchases to be respectful to source APIs
        await delay(1000 + Math.random() * 2000);

      } catch (error) {
        failedCount++;
        logger.error(`Failed to purchase candidate ${candidate.sku}:`, error, {
          source: candidate.source,
          cost: candidate.cost,
        });

        purchaseResults.push({
          candidate,
          error: error.message,
        });

        if (!dryRun) {
          // Log purchase failure but don't mark candidate as rejected
          // It might succeed on retry
          await prisma.ledger.create({
            data: {
              event: 'buyer.purchase_failed',
              payloadJson: {
                candidateId: candidate.id,
                sku: candidate.sku,
                source: candidate.source,
                cost: Number(candidate.cost),
                error: error.message,
                timestamp: new Date().toISOString(),
              },
              actor: 'buyer',
            },
          });
        }
      }
    }

    // Log purchase summary
    await prisma.ledger.create({
      data: {
        event: 'buyer.batch_completed',
        payloadJson: {
          totalCandidates: affordableCandidates.length,
          purchased: purchasedCount,
          failed: failedCount,
          totalSpent: Math.round(totalSpent * 100) / 100,
          successRate: affordableCandidates.length > 0 ? purchasedCount / affordableCandidates.length : 0,
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'buyer',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      totalCandidates: affordableCandidates.length,
      attempted: affordableCandidates.length,
      purchased: purchasedCount,
      failed: failedCount,
      totalSpent: Math.round(totalSpent * 100) / 100,
      successRate: affordableCandidates.length > 0 ? purchasedCount / affordableCandidates.length : 0,
      dryRun,
    };

    logger.info('Purchase execution completed', result);
    return result;

  } catch (error) {
    logger.error('Purchase job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'buyer.job_failed',
        payloadJson: {
          candidateId,
          batchSize,
          maxSpendAmount,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'buyer',
      },
    });

    throw error;
  }
}

// Helper function to check if we can afford a batch of purchases
export async function checkBudgetAvailability(maxAmount: number): Promise<{
  availableBudget: number;
  affordableCandidates: number;
  totalValue: number;
}> {
  const candidates = await prisma.dealCandidate.findMany({
    where: {
      status: 'APPROVED',
    },
    orderBy: [
      { netMargin: 'desc' },
      { discoveredAt: 'asc' },
    ],
  });

  let affordableCount = 0;
  let totalValue = 0;
  let usedBudget = 0;

  for (const candidate of candidates) {
    const cost = Number(candidate.cost);
    if (usedBudget + cost <= maxAmount) {
      affordableCount++;
      totalValue += Number(candidate.estimatedResale);
      usedBudget += cost;
    } else {
      break;
    }
  }

  return {
    availableBudget: maxAmount - usedBudget,
    affordableCandidates: affordableCount,
    totalValue: Math.round(totalValue * 100) / 100,
  };
}

// Helper function to get purchase statistics
export async function getPurchaseStats(days: number = 30): Promise<{
  totalPurchases: number;
  totalSpent: number;
  successRate: number;
  avgCostPerItem: number;
  topSources: Array<{ source: string; count: number; spent: number }>;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const purchasedCandidates = await prisma.dealCandidate.findMany({
    where: {
      status: 'PURCHASED',
      processedAt: { gte: startDate },
    },
  });

  const totalPurchases = purchasedCandidates.length;
  const totalSpent = purchasedCandidates.reduce((sum, c) => sum + Number(c.cost), 0);
  
  // Get total attempts (including failures)
  const attempts = await prisma.ledger.count({
    where: {
      event: { in: ['buyer.purchase_failed', 'buyer.batch_completed'] },
      ts: { gte: startDate },
    },
  });

  const successRate = attempts > 0 ? totalPurchases / attempts : 0;
  const avgCostPerItem = totalPurchases > 0 ? totalSpent / totalPurchases : 0;

  // Calculate top sources
  const sourceStats = new Map<string, { count: number; spent: number }>();
  for (const candidate of purchasedCandidates) {
    const current = sourceStats.get(candidate.source) || { count: 0, spent: 0 };
    current.count++;
    current.spent += Number(candidate.cost);
    sourceStats.set(candidate.source, current);
  }

  const topSources = Array.from(sourceStats.entries())
    .map(([source, stats]) => ({ source, ...stats }))
    .sort((a, b) => b.spent - a.spent)
    .slice(0, 5);

  return {
    totalPurchases,
    totalSpent: Math.round(totalSpent * 100) / 100,
    successRate: Math.round(successRate * 100) / 100,
    avgCostPerItem: Math.round(avgCostPerItem * 100) / 100,
    topSources,
  };
}

// Utility function for delays
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to retry failed purchases
export async function retryFailedPurchases(maxRetries: number = 3): Promise<void> {
  logger.info(`Retrying failed purchases (max ${maxRetries} attempts)`);

  // Find candidates that failed recently
  const recentFailures = await prisma.ledger.findMany({
    where: {
      event: 'buyer.purchase_failed',
      ts: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
    },
    orderBy: { ts: 'desc' },
    take: 20,
  });

  for (const failure of recentFailures) {
    const payload = failure.payloadJson as any;
    const candidateId = payload.candidateId;

    // Check if candidate is still approved
    const candidate = await prisma.dealCandidate.findUnique({
      where: { id: candidateId, status: 'APPROVED' },
    });

    if (!candidate) {
      continue; // Skip if no longer approved
    }

    // Count previous retry attempts
    const retryCount = await prisma.ledger.count({
      where: {
        event: 'buyer.purchase_failed',
        payloadJson: { path: ['candidateId'], equals: candidateId },
      },
    });

    if (retryCount >= maxRetries) {
      logger.info(`Candidate ${candidate.sku} exceeded max retry attempts`, {
        candidateId,
        retryCount,
        maxRetries,
      });
      continue;
    }

    // Retry the purchase
    try {
      logger.info(`Retrying purchase for candidate ${candidate.sku}`, {
        candidateId,
        attempt: retryCount + 1,
        maxRetries,
      });

      // Add small delay between retries
      await delay(5000);
      
      // This would trigger a new buyer job for just this candidate
      // await buyerJob({ data: { candidateId } } as Job<BuyerJobData>);
      
    } catch (error) {
      logger.error(`Retry failed for candidate ${candidate.sku}:`, error);
    }
  }
}