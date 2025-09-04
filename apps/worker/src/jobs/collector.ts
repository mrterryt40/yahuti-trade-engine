import { Job } from 'bullmq';
import { prisma, Marketplace, TxStatus } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('Collector');

export interface CollectorJobData {
  marketplace?: Marketplace;
  reconcilePayments?: boolean;
  calculateFees?: boolean;
  generateReports?: boolean;
  maxDaysBack?: number;
  dryRun?: boolean;
}

export interface PaymentRecord {
  transactionId: string;
  marketplace: Marketplace;
  paymentId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  paymentDate: Date;
  status: 'pending' | 'completed' | 'disputed' | 'refunded';
  currency: string;
}

export interface FeeBreakdown {
  marketplace: Marketplace;
  transactionId: string;
  listingFee: number;
  finalValueFee: number;
  paymentProcessingFee: number;
  promotionFee: number;
  otherFees: number;
  totalFees: number;
  feeRate: number; // percentage
}

export interface ReconciliationResult {
  marketplace: Marketplace;
  totalTransactions: number;
  reconciledTransactions: number;
  discrepancies: number;
  totalGrossRevenue: number;
  totalFees: number;
  totalNetRevenue: number;
  averageFeeRate: number;
}

export interface MarketplacePayout {
  marketplace: Marketplace;
  payoutId: string;
  payoutDate: Date;
  totalAmount: number;
  transactionCount: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
  fees: number;
  currency: string;
}

// Mock marketplace API clients for payment reconciliation
const MARKETPLACE_APIS = {
  EBAY: {
    name: 'eBay',
    endpoint: 'https://api.ebay.com/sell/finances/v1',
    payoutSchedule: 'weekly', // Monday
    payoutDelay: 2, // days
    feeTypes: ['listing', 'final_value', 'payment_processing', 'international'],
  },
  AMAZON: {
    name: 'Amazon',
    endpoint: 'https://sellingpartnerapi.amazon.com/finances/v0',
    payoutSchedule: 'biweekly', // Every 14 days
    payoutDelay: 3,
    feeTypes: ['referral', 'fulfillment', 'storage', 'advertising'],
  },
  G2G: {
    name: 'G2G',
    endpoint: 'https://api.g2g.com/v1/finances',
    payoutSchedule: 'daily',
    payoutDelay: 1,
    feeTypes: ['commission', 'payment_processing', 'dispute_fee'],
  },
  PLAYERAUCTIONS: {
    name: 'PlayerAuctions',
    endpoint: 'https://api.playerauctions.com/v1/payments',
    payoutSchedule: 'weekly',
    payoutDelay: 1,
    feeTypes: ['commission', 'payment_gateway', 'chargeback_fee'],
  },
  GODADDY: {
    name: 'GoDaddy Auctions',
    endpoint: 'https://api.godaddy.com/v1/auctions/finance',
    payoutSchedule: 'monthly',
    payoutDelay: 5,
    feeTypes: ['seller_fee', 'payment_processing', 'listing_fee'],
  },
  NAMECHEAP: {
    name: 'Namecheap',
    endpoint: 'https://api.namecheap.com/xml.response',
    payoutSchedule: 'monthly',
    payoutDelay: 7,
    feeTypes: ['commission', 'transaction_fee'],
  },
};

export async function collectorJob(job: Job<CollectorJobData>) {
  const {
    marketplace,
    reconcilePayments = true,
    calculateFees = true,
    generateReports = true,
    maxDaysBack = 30,
    dryRun = false
  } = job.data;

  logger.info('Starting payment and fee reconciliation job', {
    marketplace,
    reconcilePayments,
    calculateFees,
    generateReports,
    maxDaysBack,
    dryRun,
  });

  try {
    const reconciliationResults: ReconciliationResult[] = [];
    const feeBreakdowns: FeeBreakdown[] = [];
    const paymentRecords: PaymentRecord[] = [];

    // Determine which marketplaces to process
    const marketplacesToProcess = marketplace ? 
      [marketplace] : 
      Object.keys(MARKETPLACE_APIS) as Marketplace[];

    logger.info(`Processing ${marketplacesToProcess.length} marketplaces`);

    // Update job progress
    await job.updateProgress(10);

    // Process each marketplace
    for (let i = 0; i < marketplacesToProcess.length; i++) {
      const mp = marketplacesToProcess[i];
      
      logger.info(`Processing marketplace: ${mp}`);

      try {
        if (reconcilePayments) {
          // Reconcile payments for this marketplace
          const paymentData = await reconcileMarketplacePayments(mp, maxDaysBack, dryRun);
          paymentRecords.push(...paymentData.payments);
          
          if (paymentData.reconciliation) {
            reconciliationResults.push(paymentData.reconciliation);
          }
        }

        if (calculateFees) {
          // Calculate detailed fees for this marketplace
          const fees = await calculateMarketplaceFees(mp, maxDaysBack);
          feeBreakdowns.push(...fees);
        }

        // Update progress
        const progress = 10 + ((i + 1) / marketplacesToProcess.length) * 70;
        await job.updateProgress(Math.round(progress));

        // Add delay between marketplace API calls
        await delay(1000 + Math.random() * 2000);

      } catch (error) {
        logger.error(`Failed to process marketplace ${mp}:`, error);
        
        // Continue with other marketplaces
        continue;
      }
    }

    // Update job progress
    await job.updateProgress(80);

    // Generate financial reports
    let reportsGenerated = [];
    if (generateReports) {
      reportsGenerated = await generateFinancialReports(
        reconciliationResults,
        feeBreakdowns,
        paymentRecords,
        dryRun
      );
    }

    // Update job progress
    await job.updateProgress(90);

    // Log collection activity
    await prisma.ledger.create({
      data: {
        event: 'collector.reconciliation_completed',
        payloadJson: {
          marketplacesProcessed: marketplacesToProcess.length,
          totalPaymentRecords: paymentRecords.length,
          totalFeeBreakdowns: feeBreakdowns.length,
          totalGrossRevenue: reconciliationResults.reduce((sum, r) => sum + r.totalGrossRevenue, 0),
          totalNetRevenue: reconciliationResults.reduce((sum, r) => sum + r.totalNetRevenue, 0),
          totalFees: reconciliationResults.reduce((sum, r) => sum + r.totalFees, 0),
          reportsGenerated: reportsGenerated.length,
          maxDaysBack,
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'collector',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      marketplacesProcessed: marketplacesToProcess.length,
      reconciliationResults,
      feeBreakdowns: feeBreakdowns.length,
      paymentRecords: paymentRecords.length,
      reportsGenerated: reportsGenerated.length,
      totalGrossRevenue: reconciliationResults.reduce((sum, r) => sum + r.totalGrossRevenue, 0),
      totalNetRevenue: reconciliationResults.reduce((sum, r) => sum + r.totalNetRevenue, 0),
      totalFees: reconciliationResults.reduce((sum, r) => sum + r.totalFees, 0),
      dryRun,
    };

    logger.info('Collector job completed', {
      marketplacesProcessed: result.marketplacesProcessed,
      totalGrossRevenue: result.totalGrossRevenue,
      totalFees: result.totalFees,
      netRevenue: result.totalNetRevenue,
    });

    return result;

  } catch (error) {
    logger.error('Collector job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'collector.job_failed',
        payloadJson: {
          marketplace,
          maxDaysBack,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'collector',
      },
    });

    throw error;
  }
}

async function reconcileMarketplacePayments(
  marketplace: Marketplace,
  maxDaysBack: number,
  dryRun: boolean
): Promise<{
  payments: PaymentRecord[];
  reconciliation: ReconciliationResult | null;
}> {
  logger.info(`Reconciling payments for ${marketplace}`);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - maxDaysBack);

  // Get our recorded transactions for this marketplace
  const ourTransactions = await prisma.transaction.findMany({
    where: {
      marketplace,
      createdAt: { gte: startDate },
      status: { in: ['DELIVERED', 'DISPUTED', 'REFUNDED'] },
    },
    orderBy: { createdAt: 'desc' },
  });

  logger.info(`Found ${ourTransactions.length} transactions to reconcile for ${marketplace}`);

  // Mock API call to marketplace for their payment records
  const marketplacePayments = await fetchMarketplacePayments(marketplace, startDate);
  
  logger.info(`Retrieved ${marketplacePayments.length} payment records from ${marketplace}`);

  // Reconcile transactions
  const reconciliationResult = await performReconciliation(
    ourTransactions,
    marketplacePayments,
    marketplace,
    dryRun
  );

  return {
    payments: marketplacePayments,
    reconciliation: reconciliationResult,
  };
}

async function fetchMarketplacePayments(
  marketplace: Marketplace,
  startDate: Date
): Promise<PaymentRecord[]> {
  // Mock API call - in reality would call actual marketplace APIs
  await delay(500 + Math.random() * 1500);

  const api = MARKETPLACE_APIS[marketplace];
  const paymentCount = 10 + Math.floor(Math.random() * 50);
  const payments: PaymentRecord[] = [];

  for (let i = 0; i < paymentCount; i++) {
    const baseAmount = 20 + Math.random() * 200;
    const feeRate = 0.1 + Math.random() * 0.05; // 10-15% fees
    const feeAmount = baseAmount * feeRate;
    const netAmount = baseAmount - feeAmount;

    // Create payment date within the specified range
    const paymentDate = new Date(
      startDate.getTime() + Math.random() * (Date.now() - startDate.getTime())
    );

    payments.push({
      transactionId: `${marketplace.toLowerCase()}_tx_${Date.now()}_${i}`,
      marketplace,
      paymentId: `${marketplace.toLowerCase()}_pmt_${Date.now()}_${i}`,
      grossAmount: Math.round(baseAmount * 100) / 100,
      feeAmount: Math.round(feeAmount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
      paymentDate,
      status: Math.random() > 0.95 ? 'disputed' : Math.random() > 0.98 ? 'refunded' : 'completed',
      currency: 'USD',
    });
  }

  // Sort by payment date
  return payments.sort((a, b) => a.paymentDate.getTime() - b.paymentDate.getTime());
}

async function performReconciliation(
  ourTransactions: any[],
  marketplacePayments: PaymentRecord[],
  marketplace: Marketplace,
  dryRun: boolean
): Promise<ReconciliationResult> {
  logger.info(`Performing reconciliation for ${marketplace}`);

  let reconciledCount = 0;
  let discrepancyCount = 0;
  const discrepancies = [];

  // Try to match our transactions with marketplace payments
  for (const ourTx of ourTransactions) {
    // In reality, would match by order ID, SKU, amount, and date
    const matchingPayment = marketplacePayments.find(mp => 
      Math.abs(Number(ourTx.salePrice) - mp.grossAmount) < 0.01 &&
      Math.abs(ourTx.createdAt.getTime() - mp.paymentDate.getTime()) < 24 * 60 * 60 * 1000 // Within 24 hours
    );

    if (matchingPayment) {
      reconciledCount++;
      
      // Check for discrepancies in fees
      const ourFees = Number(ourTx.fees);
      const theirFees = matchingPayment.feeAmount;
      
      if (Math.abs(ourFees - theirFees) > 0.01) {
        discrepancyCount++;
        discrepancies.push({
          transactionId: ourTx.id,
          paymentId: matchingPayment.paymentId,
          ourFees,
          theirFees,
          difference: Math.round((theirFees - ourFees) * 100) / 100,
        });
      }

      // Update our transaction with marketplace payment ID if not dry run
      if (!dryRun) {
        await prisma.transaction.update({
          where: { id: ourTx.id },
          data: {
            meta: {
              ...((ourTx.meta as any) || {}),
              marketplacePaymentId: matchingPayment.paymentId,
              reconciledAt: new Date().toISOString(),
              feeDiscrepancy: Math.abs(ourFees - theirFees) > 0.01 ? theirFees - ourFees : undefined,
            },
          },
        });
      }
    }
  }

  // Log discrepancies
  if (discrepancies.length > 0 && !dryRun) {
    for (const discrepancy of discrepancies) {
      await prisma.ledger.create({
        data: {
          event: 'collector.fee_discrepancy',
          payloadJson: {
            marketplace,
            ...discrepancy,
            timestamp: new Date().toISOString(),
          },
          actor: 'collector',
        },
      });
    }
  }

  // Calculate totals
  const totalGrossRevenue = marketplacePayments.reduce((sum, p) => sum + p.grossAmount, 0);
  const totalFees = marketplacePayments.reduce((sum, p) => sum + p.feeAmount, 0);
  const totalNetRevenue = totalGrossRevenue - totalFees;
  const averageFeeRate = totalGrossRevenue > 0 ? (totalFees / totalGrossRevenue) * 100 : 0;

  const reconciliationResult: ReconciliationResult = {
    marketplace,
    totalTransactions: ourTransactions.length,
    reconciledTransactions: reconciledCount,
    discrepancies: discrepancyCount,
    totalGrossRevenue: Math.round(totalGrossRevenue * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    totalNetRevenue: Math.round(totalNetRevenue * 100) / 100,
    averageFeeRate: Math.round(averageFeeRate * 100) / 100,
  };

  logger.info(`Reconciliation completed for ${marketplace}`, {
    reconciledCount,
    discrepancyCount,
    totalGrossRevenue: reconciliationResult.totalGrossRevenue,
    averageFeeRate: reconciliationResult.averageFeeRate,
  });

  return reconciliationResult;
}

async function calculateMarketplaceFees(
  marketplace: Marketplace,
  maxDaysBack: number
): Promise<FeeBreakdown[]> {
  logger.info(`Calculating detailed fees for ${marketplace}`);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - maxDaysBack);

  // Get delivered transactions for this marketplace
  const transactions = await prisma.transaction.findMany({
    where: {
      marketplace,
      status: 'DELIVERED',
      createdAt: { gte: startDate },
    },
    take: 100, // Limit for performance
  });

  const feeBreakdowns: FeeBreakdown[] = [];
  const api = MARKETPLACE_APIS[marketplace];

  for (const tx of transactions) {
    const salePrice = Number(tx.salePrice);
    
    // Calculate different fee components based on marketplace
    const breakdown = calculateFeeComponents(marketplace, salePrice, api.feeTypes);
    
    feeBreakdowns.push({
      marketplace,
      transactionId: tx.id,
      ...breakdown,
      totalFees: Object.values(breakdown).reduce((sum, fee) => 
        typeof fee === 'number' ? sum + fee : sum, 0
      ),
      feeRate: salePrice > 0 ? (breakdown.totalFees / salePrice) * 100 : 0,
    });
  }

  logger.info(`Calculated fees for ${feeBreakdowns.length} transactions on ${marketplace}`);
  return feeBreakdowns;
}

function calculateFeeComponents(
  marketplace: Marketplace,
  salePrice: number,
  feeTypes: string[]
): Omit<FeeBreakdown, 'marketplace' | 'transactionId' | 'totalFees' | 'feeRate'> {
  const components = {
    listingFee: 0,
    finalValueFee: 0,
    paymentProcessingFee: 0,
    promotionFee: 0,
    otherFees: 0,
  };

  switch (marketplace) {
    case 'EBAY':
      components.finalValueFee = salePrice * 0.129; // 12.9%
      components.paymentProcessingFee = salePrice * 0.029 + 0.30; // 2.9% + $0.30
      components.promotionFee = salePrice * 0.02; // 2% for promoted listings
      break;

    case 'AMAZON':
      components.finalValueFee = salePrice * 0.15; // 15%
      components.otherFees = salePrice * 0.02; // Storage and other fees
      break;

    case 'G2G':
      components.finalValueFee = salePrice * 0.109; // 10.9%
      components.paymentProcessingFee = salePrice * 0.025 + 0.25;
      break;

    case 'PLAYERAUCTIONS':
      components.finalValueFee = salePrice * 0.119; // 11.9%
      components.paymentProcessingFee = salePrice * 0.024 + 0.30;
      break;

    case 'GODADDY':
      components.finalValueFee = salePrice * 0.20; // 20%
      components.paymentProcessingFee = salePrice * 0.029 + 0.30;
      break;

    case 'NAMECHEAP':
      components.finalValueFee = salePrice * 0.18; // 18%
      components.paymentProcessingFee = salePrice * 0.029 + 0.30;
      break;
  }

  // Round all components to 2 decimal places
  Object.keys(components).forEach(key => {
    components[key] = Math.round(components[key] * 100) / 100;
  });

  return components;
}

async function generateFinancialReports(
  reconciliationResults: ReconciliationResult[],
  feeBreakdowns: FeeBreakdown[],
  paymentRecords: PaymentRecord[],
  dryRun: boolean
): Promise<string[]> {
  logger.info('Generating financial reports');

  const reports: string[] = [];

  try {
    // Revenue Summary Report
    const revenueSummary = {
      totalGrossRevenue: reconciliationResults.reduce((sum, r) => sum + r.totalGrossRevenue, 0),
      totalFees: reconciliationResults.reduce((sum, r) => sum + r.totalFees, 0),
      totalNetRevenue: reconciliationResults.reduce((sum, r) => sum + r.totalNetRevenue, 0),
      averageFeeRate: reconciliationResults.reduce((sum, r) => sum + r.averageFeeRate, 0) / reconciliationResults.length,
      marketplaceBreakdown: reconciliationResults.map(r => ({
        marketplace: r.marketplace,
        grossRevenue: r.totalGrossRevenue,
        fees: r.totalFees,
        netRevenue: r.totalNetRevenue,
        feeRate: r.averageFeeRate,
      })),
    };

    reports.push('revenue_summary');

    // Fee Analysis Report
    const feeAnalysis = {
      totalTransactions: feeBreakdowns.length,
      averageTotalFees: feeBreakdowns.reduce((sum, f) => sum + f.totalFees, 0) / feeBreakdowns.length,
      feesByMarketplace: Object.entries(
        feeBreakdowns.reduce((acc, f) => {
          if (!acc[f.marketplace]) {
            acc[f.marketplace] = { totalFees: 0, count: 0 };
          }
          acc[f.marketplace].totalFees += f.totalFees;
          acc[f.marketplace].count++;
          return acc;
        }, {} as Record<string, { totalFees: number; count: number }>)
      ).map(([marketplace, data]) => ({
        marketplace,
        averageFees: data.totalFees / data.count,
        totalFees: data.totalFees,
        transactionCount: data.count,
      })),
    };

    reports.push('fee_analysis');

    // Payment Status Report
    const paymentStatusSummary = {
      totalPayments: paymentRecords.length,
      statusBreakdown: Object.entries(
        paymentRecords.reduce((acc, p) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([status, count]) => ({ status, count })),
      disputedPayments: paymentRecords.filter(p => p.status === 'disputed').length,
      refundedPayments: paymentRecords.filter(p => p.status === 'refunded').length,
    };

    reports.push('payment_status');

    // Discrepancy Report
    const discrepancyReport = {
      totalDiscrepancies: reconciliationResults.reduce((sum, r) => sum + r.discrepancies, 0),
      discrepancyRate: reconciliationResults.length > 0 ? 
        reconciliationResults.reduce((sum, r) => sum + r.discrepancies, 0) / 
        reconciliationResults.reduce((sum, r) => sum + r.totalTransactions, 0) : 0,
      marketplaceDiscrepancies: reconciliationResults.map(r => ({
        marketplace: r.marketplace,
        discrepancies: r.discrepancies,
        discrepancyRate: r.totalTransactions > 0 ? r.discrepancies / r.totalTransactions : 0,
      })),
    };

    reports.push('discrepancy_report');

    // Save reports to database if not dry run
    if (!dryRun) {
      await prisma.ledger.create({
        data: {
          event: 'collector.revenue_summary_generated',
          payloadJson: revenueSummary,
          actor: 'collector',
        },
      });

      await prisma.ledger.create({
        data: {
          event: 'collector.fee_analysis_generated',
          payloadJson: feeAnalysis,
          actor: 'collector',
        },
      });

      await prisma.ledger.create({
        data: {
          event: 'collector.payment_status_generated',
          payloadJson: paymentStatusSummary,
          actor: 'collector',
        },
      });

      await prisma.ledger.create({
        data: {
          event: 'collector.discrepancy_report_generated',
          payloadJson: discrepancyReport,
          actor: 'collector',
        },
      });
    }

    logger.info(`Generated ${reports.length} financial reports`, {
      totalGrossRevenue: revenueSummary.totalGrossRevenue,
      totalNetRevenue: revenueSummary.totalNetRevenue,
      averageFeeRate: revenueSummary.averageFeeRate,
      totalDiscrepancies: discrepancyReport.totalDiscrepancies,
    });

  } catch (error) {
    logger.error('Failed to generate financial reports:', error);
  }

  return reports;
}

// Function to get collection statistics
export async function getCollectionStats(days: number = 30): Promise<{
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  averageFeeRate: number;
  reconciliationRate: number;
  lastCollectionRun: Date | null;
  topRevenueMarketplace: Marketplace;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const deliveredTransactions = await prisma.transaction.findMany({
    where: {
      status: 'DELIVERED',
      createdAt: { gte: startDate },
    },
  });

  const totalRevenue = deliveredTransactions.reduce((sum, tx) => sum + Number(tx.salePrice), 0);
  const totalFees = deliveredTransactions.reduce((sum, tx) => sum + Number(tx.fees), 0);
  const netRevenue = deliveredTransactions.reduce((sum, tx) => sum + Number(tx.net), 0);
  const averageFeeRate = totalRevenue > 0 ? (totalFees / totalRevenue) * 100 : 0;

  // Get reconciliation rate
  const reconciledTransactions = deliveredTransactions.filter(tx => {
    const meta = tx.meta as any;
    return meta && meta.marketplacePaymentId;
  });
  const reconciliationRate = deliveredTransactions.length > 0 ? 
    reconciledTransactions.length / deliveredTransactions.length : 0;

  // Find top revenue marketplace
  const marketplaceRevenue = new Map<Marketplace, number>();
  deliveredTransactions.forEach(tx => {
    const current = marketplaceRevenue.get(tx.marketplace) || 0;
    marketplaceRevenue.set(tx.marketplace, current + Number(tx.salePrice));
  });

  const topRevenueMarketplace = Array.from(marketplaceRevenue.entries())
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'EBAY';

  // Get last collection run
  const lastCollection = await prisma.ledger.findFirst({
    where: { event: 'collector.reconciliation_completed' },
    orderBy: { ts: 'desc' },
  });

  return {
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalFees: Math.round(totalFees * 100) / 100,
    netRevenue: Math.round(netRevenue * 100) / 100,
    averageFeeRate: Math.round(averageFeeRate * 100) / 100,
    reconciliationRate: Math.round(reconciliationRate * 1000) / 1000,
    lastCollectionRun: lastCollection?.ts || null,
    topRevenueMarketplace,
  };
}

// Function to detect payment anomalies
export async function detectPaymentAnomalies(): Promise<Array<{
  type: 'high_fees' | 'missing_payment' | 'duplicate_payment' | 'unusual_amount';
  description: string;
  transactionId?: string;
  severity: 'low' | 'medium' | 'high';
  suggestedAction: string;
}>> {
  const anomalies = [];
  const recentTransactions = await prisma.transaction.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: 'DELIVERED',
    },
    take: 200,
  });

  // Check for unusually high fees
  const avgFeeRate = recentTransactions.reduce((sum, tx) => {
    const feeRate = Number(tx.fees) / Number(tx.salePrice);
    return sum + feeRate;
  }, 0) / recentTransactions.length;

  for (const tx of recentTransactions) {
    const feeRate = Number(tx.fees) / Number(tx.salePrice);
    if (feeRate > avgFeeRate * 2) {
      anomalies.push({
        type: 'high_fees',
        description: `Transaction has unusually high fee rate: ${(feeRate * 100).toFixed(1)}%`,
        transactionId: tx.id,
        severity: 'medium',
        suggestedAction: 'Review fee calculation and marketplace terms',
      });
    }
  }

  // Check for missing payment reconciliation
  const unreconciledTransactions = recentTransactions.filter(tx => {
    const meta = tx.meta as any;
    return !meta || !meta.marketplacePaymentId;
  });

  if (unreconciledTransactions.length > recentTransactions.length * 0.3) {
    anomalies.push({
      type: 'missing_payment',
      description: `${unreconciledTransactions.length} transactions lack payment reconciliation`,
      severity: 'high',
      suggestedAction: 'Run payment reconciliation job immediately',
    });
  }

  return anomalies;
}

// Function to get payout schedule
export async function getPayoutSchedule(): Promise<Array<{
  marketplace: Marketplace;
  nextPayoutDate: Date;
  estimatedAmount: number;
  status: 'scheduled' | 'processing' | 'overdue';
}>> {
  const payouts = [];

  for (const [marketplace, api] of Object.entries(MARKETPLACE_APIS)) {
    const mp = marketplace as Marketplace;
    
    // Calculate next payout date based on schedule
    const nextPayoutDate = calculateNextPayoutDate(api.payoutSchedule, api.payoutDelay);
    
    // Estimate payout amount from unreconciled transactions
    const pendingTransactions = await prisma.transaction.findMany({
      where: {
        marketplace: mp,
        status: 'DELIVERED',
        createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    });

    const estimatedAmount = pendingTransactions.reduce((sum, tx) => sum + Number(tx.net), 0);
    
    // Determine status
    let status: 'scheduled' | 'processing' | 'overdue' = 'scheduled';
    if (nextPayoutDate < new Date()) {
      status = 'overdue';
    } else if (nextPayoutDate.getTime() - Date.now() < 24 * 60 * 60 * 1000) {
      status = 'processing';
    }

    payouts.push({
      marketplace: mp,
      nextPayoutDate,
      estimatedAmount: Math.round(estimatedAmount * 100) / 100,
      status,
    });
  }

  return payouts;
}

function calculateNextPayoutDate(schedule: string, delay: number): Date {
  const now = new Date();
  let nextPayout: Date;

  switch (schedule) {
    case 'daily':
      nextPayout = new Date(now);
      nextPayout.setDate(now.getDate() + 1);
      break;
    case 'weekly':
      nextPayout = new Date(now);
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      nextPayout.setDate(now.getDate() + daysUntilMonday);
      break;
    case 'biweekly':
      nextPayout = new Date(now);
      nextPayout.setDate(now.getDate() + 14);
      break;
    case 'monthly':
      nextPayout = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    default:
      nextPayout = new Date(now);
      nextPayout.setDate(now.getDate() + 7);
  }

  // Add processing delay
  nextPayout.setDate(nextPayout.getDate() + delay);

  return nextPayout;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}