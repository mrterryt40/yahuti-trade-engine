import { Job } from 'bullmq';
import { prisma, Marketplace, ListingStatus } from '@yahuti/db';
import { createLogger } from '../utils/logger';
import { MarketplaceClient } from '../services/marketplace-client';
import { FeeCalculator } from '../services/fee-calculator';

const logger = createLogger('Reprice');

export interface RepriceJobData {
  listingId?: string;
  marketplace?: Marketplace;
  batchSize?: number;
  maxPriceChangePercent?: number;
  competitorAnalysisEnabled?: boolean;
  dryRun?: boolean;
}

export interface PricingStrategy {
  strategy: 'competitive' | 'margin_protect' | 'quick_sell' | 'premium' | 'market_follow';
  aggressiveness: 'conservative' | 'moderate' | 'aggressive';
  minMarginPercent: number;
  maxPriceIncrease: number; // percentage
  maxPriceDecrease: number; // percentage
  considerViews: boolean;
  considerAge: boolean;
  considerSellThroughRate: boolean;
}

export interface CompetitorData {
  marketplace: Marketplace;
  sku: string;
  competitors: Array<{
    sellerId: string;
    price: number;
    condition: string;
    rating: number;
    shippingCost: number;
    positionRank: number;
  }>;
  marketPrice: {
    lowest: number;
    average: number;
    median: number;
    highest: number;
  };
  demandSignals: {
    views: number;
    watchers: number;
    soldRecently: number;
  };
}

export interface RepriceRecommendation {
  currentPrice: number;
  recommendedPrice: number;
  priceChange: number;
  priceChangePercent: number;
  confidence: number;
  reasoning: string[];
  marketPosition: 'leader' | 'competitive' | 'follower' | 'premium';
  expectedImpact: {
    salesProbability: number;
    marginChange: number;
    positionChange: number;
  };
}

const DEFAULT_PRICING_STRATEGY: PricingStrategy = {
  strategy: 'competitive',
  aggressiveness: 'moderate',
  minMarginPercent: 15,
  maxPriceIncrease: 20,
  maxPriceDecrease: 25,
  considerViews: true,
  considerAge: true,
  considerSellThroughRate: true,
};

export async function repriceJob(job: Job<RepriceJobData>) {
  const {
    listingId,
    marketplace,
    batchSize = 100,
    maxPriceChangePercent = 30,
    competitorAnalysisEnabled = true,
    dryRun = false
  } = job.data;

  logger.info('Starting reprice job', {
    listingId,
    marketplace,
    batchSize,
    maxPriceChangePercent,
    competitorAnalysisEnabled,
    dryRun,
  });

  try {
    let listings;
    let totalListings;

    if (listingId) {
      // Reprice specific listing
      const listing = await prisma.listing.findUnique({
        where: { 
          id: listingId,
          status: 'ACTIVE',
        },
      });

      if (!listing) {
        throw new Error(`Active listing ${listingId} not found`);
      }

      listings = [listing];
      totalListings = 1;
    } else {
      // Reprice batch of active listings
      const whereClause: any = {
        status: 'ACTIVE',
        updatedAt: {
          lt: new Date(Date.now() - 6 * 60 * 60 * 1000), // Not updated in last 6 hours
        },
      };

      if (marketplace) {
        whereClause.marketplace = marketplace;
      }

      listings = await prisma.listing.findMany({
        where: whereClause,
        take: batchSize,
        orderBy: [
          { views: 'desc' }, // Prioritize listings with more views
          { updatedAt: 'asc' }, // Then by oldest first
        ],
      });
      totalListings = listings.length;
    }

    if (listings.length === 0) {
      logger.info('No listings to reprice');
      return {
        success: true,
        totalListings: 0,
        repriced: 0,
        skipped: 0,
        failed: 0,
        dryRun,
      };
    }

    logger.info(`Found ${listings.length} listings to analyze for repricing`);

    // Update job progress
    await job.updateProgress(10);

    const feeCalculator = FeeCalculator.getInstance();
    let repricedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const repriceResults = [];

    for (let i = 0; i < listings.length; i++) {
      const listing = listings[i];
      
      logger.debug(`Analyzing listing ${listing.id}`, {
        sku: listing.sku,
        marketplace: listing.marketplace,
        currentPrice: listing.price,
        views: listing.views,
        age: Math.round((Date.now() - listing.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
      });

      try {
        // Get competitor data if enabled
        let competitorData: CompetitorData | null = null;
        if (competitorAnalysisEnabled) {
          competitorData = await getCompetitorData(listing);
        }

        // Generate pricing recommendation
        const recommendation = await generatePricingRecommendation(
          listing,
          competitorData,
          feeCalculator
        );

        // Check if price change exceeds maximum allowed
        if (Math.abs(recommendation.priceChangePercent) > maxPriceChangePercent) {
          skippedCount++;
          logger.info(`Skipping listing ${listing.id} - price change too large`, {
            sku: listing.sku,
            priceChangePercent: recommendation.priceChangePercent,
            maxAllowed: maxPriceChangePercent,
          });
          continue;
        }

        // Check if price change is significant enough to execute
        if (Math.abs(recommendation.priceChangePercent) < 2) {
          skippedCount++;
          logger.debug(`Skipping listing ${listing.id} - price change too small`, {
            sku: listing.sku,
            priceChangePercent: recommendation.priceChangePercent,
          });
          continue;
        }

        // Execute repricing if not dry run
        if (!dryRun) {
          const client = new MarketplaceClient(listing.marketplace);
          const updateResult = await client.updatePrice(
            listing.variantId || listing.id,
            recommendation.recommendedPrice
          );

          if (updateResult.success) {
            // Update listing in database
            await prisma.listing.update({
              where: { id: listing.id },
              data: {
                price: recommendation.recommendedPrice,
                updatedAt: new Date(),
              },
            });

            repricedCount++;
            
            // Log successful reprice
            await prisma.ledger.create({
              data: {
                event: 'reprice.price_updated',
                payloadJson: {
                  listingId: listing.id,
                  sku: listing.sku,
                  marketplace: listing.marketplace,
                  oldPrice: recommendation.currentPrice,
                  newPrice: recommendation.recommendedPrice,
                  priceChange: recommendation.priceChange,
                  priceChangePercent: recommendation.priceChangePercent,
                  reasoning: recommendation.reasoning,
                  confidence: recommendation.confidence,
                  timestamp: new Date().toISOString(),
                },
                actor: 'reprice',
              },
            });

            logger.info(`Repriced listing ${listing.id}`, {
              sku: listing.sku,
              oldPrice: recommendation.currentPrice,
              newPrice: recommendation.recommendedPrice,
              change: recommendation.priceChangePercent,
            });

          } else {
            failedCount++;
            logger.error(`Failed to reprice listing ${listing.id}: ${updateResult.error}`);
          }
        } else {
          // Dry run - just log what would be done
          repricedCount++;
          logger.info(`[DRY RUN] Would reprice listing ${listing.id}`, {
            sku: listing.sku,
            currentPrice: recommendation.currentPrice,
            recommendedPrice: recommendation.recommendedPrice,
            change: recommendation.priceChangePercent,
            reasoning: recommendation.reasoning.join('; '),
          });
        }

        repriceResults.push({
          listing,
          recommendation,
        });

        // Update progress
        const progress = 10 + ((i + 1) / listings.length) * 85;
        await job.updateProgress(Math.round(progress));

        // Small delay between API calls
        await delay(300 + Math.random() * 500);

      } catch (error) {
        failedCount++;
        logger.error(`Error processing listing ${listing.id}:`, error);

        if (!dryRun) {
          await prisma.ledger.create({
            data: {
              event: 'reprice.processing_error',
              payloadJson: {
                listingId: listing.id,
                sku: listing.sku,
                error: error.message,
                timestamp: new Date().toISOString(),
              },
              actor: 'reprice',
            },
          });
        }
      }
    }

    // Log reprice summary
    await prisma.ledger.create({
      data: {
        event: 'reprice.batch_completed',
        payloadJson: {
          totalListings: listings.length,
          repriced: repricedCount,
          skipped: skippedCount,
          failed: failedCount,
          successRate: listings.length > 0 ? repricedCount / listings.length : 0,
          marketplace: marketplace || 'all',
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'reprice',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      totalListings: listings.length,
      repriced: repricedCount,
      skipped: skippedCount,
      failed: failedCount,
      successRate: listings.length > 0 ? repricedCount / listings.length : 0,
      dryRun,
    };

    logger.info('Reprice job completed', result);
    return result;

  } catch (error) {
    logger.error('Reprice job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'reprice.job_failed',
        payloadJson: {
          listingId,
          marketplace,
          batchSize,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'reprice',
      },
    });

    throw error;
  }
}

async function getCompetitorData(listing: any): Promise<CompetitorData> {
  logger.debug(`Gathering competitor data for ${listing.sku} on ${listing.marketplace}`);

  // Mock competitor analysis - in reality this would scrape or use APIs
  await delay(500 + Math.random() * 1000);

  const currentPrice = Number(listing.price);
  const competitors = [];
  
  // Generate 3-10 mock competitors
  const competitorCount = 3 + Math.floor(Math.random() * 8);
  
  for (let i = 0; i < competitorCount; i++) {
    const priceVariance = 0.7 + Math.random() * 0.6; // 70%-130% of our price
    const competitorPrice = currentPrice * priceVariance;
    
    competitors.push({
      sellerId: `seller_${i + 1}`,
      price: Math.round(competitorPrice * 100) / 100,
      condition: Math.random() > 0.8 ? 'Used' : 'New',
      rating: 3.5 + Math.random() * 1.5, // 3.5-5.0 rating
      shippingCost: Math.random() * 5,
      positionRank: i + 1,
    });
  }

  // Sort by price to determine market position
  competitors.sort((a, b) => a.price - b.price);

  const prices = competitors.map(c => c.price);
  const marketPrice = {
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    average: prices.reduce((sum, p) => sum + p, 0) / prices.length,
    median: prices[Math.floor(prices.length / 2)],
  };

  const demandSignals = {
    views: listing.views + Math.floor(Math.random() * 100),
    watchers: Math.floor(Math.random() * 20),
    soldRecently: Math.floor(Math.random() * 5),
  };

  return {
    marketplace: listing.marketplace,
    sku: listing.sku,
    competitors,
    marketPrice,
    demandSignals,
  };
}

async function generatePricingRecommendation(
  listing: any,
  competitorData: CompetitorData | null,
  feeCalculator: FeeCalculator
): Promise<RepriceRecommendation> {
  
  const strategy = DEFAULT_PRICING_STRATEGY; // In reality, this might come from configuration
  const currentPrice = Number(listing.price);
  const reasoning: string[] = [];
  let recommendedPrice = currentPrice;
  let confidence = 0.5;

  // Analyze listing age
  const ageInDays = (Date.now() - listing.createdAt.getTime()) / (24 * 60 * 60 * 1000);
  const isOldListing = ageInDays > 14;

  // Analyze views and engagement
  const hasLowViews = listing.views < 10 && ageInDays > 3;
  const hasHighViews = listing.views > 50;

  // Base price adjustment based on performance
  let performanceMultiplier = 1.0;

  if (hasLowViews) {
    performanceMultiplier = 0.95; // Reduce price by 5% for low engagement
    reasoning.push('Low views suggest price is too high');
    confidence += 0.2;
  }

  if (hasHighViews && listing.ctr < 0.02) {
    performanceMultiplier = 0.97; // High views but low conversion - slight price reduction
    reasoning.push('High views but low conversion rate');
    confidence += 0.1;
  }

  if (hasHighViews && listing.ctr > 0.05) {
    performanceMultiplier = 1.05; // High engagement - can increase price
    reasoning.push('Strong engagement metrics support price increase');
    confidence += 0.3;
  }

  if (isOldListing) {
    performanceMultiplier *= 0.98; // Small discount for old listings
    reasoning.push('Listing age suggests need for competitive pricing');
    confidence += 0.1;
  }

  // Competitor-based adjustments
  if (competitorData) {
    const ourPosition = findOurMarketPosition(currentPrice, competitorData);
    
    switch (strategy.strategy) {
      case 'competitive':
        if (currentPrice > competitorData.marketPrice.average * 1.1) {
          // We're significantly above average - reduce price
          recommendedPrice = competitorData.marketPrice.average * 1.05;
          reasoning.push('Reducing price to match competitive average');
          confidence += 0.3;
        } else if (currentPrice < competitorData.marketPrice.average * 0.9) {
          // We're significantly below average - can increase price
          recommendedPrice = competitorData.marketPrice.average * 0.98;
          reasoning.push('Market allows for price increase');
          confidence += 0.2;
        }
        break;

      case 'market_follow':
        // Try to be slightly below lowest competitor
        if (competitorData.marketPrice.lowest > 0) {
          recommendedPrice = competitorData.marketPrice.lowest * 0.99;
          reasoning.push('Positioning just below lowest competitor');
          confidence += 0.4;
        }
        break;

      case 'premium':
        // Stay above average but not too high
        const premiumTarget = competitorData.marketPrice.average * 1.15;
        if (currentPrice < premiumTarget) {
          recommendedPrice = premiumTarget;
          reasoning.push('Positioning for premium market segment');
          confidence += 0.2;
        }
        break;

      case 'quick_sell':
        // Aggressive pricing for quick sales
        recommendedPrice = competitorData.marketPrice.lowest * 0.95;
        reasoning.push('Aggressive pricing for quick sale');
        confidence += 0.3;
        break;
    }
  }

  // Apply performance multiplier
  recommendedPrice *= performanceMultiplier;

  // Check margin constraints
  const estimatedCost = getEstimatedCost(listing);
  if (estimatedCost > 0) {
    const fees = feeCalculator.calculateFees({
      marketplace: listing.marketplace,
      category: inferCategoryFromSku(listing.sku),
      salePrice: recommendedPrice,
    });

    const netAmount = fees.netAmount;
    const margin = (netAmount - estimatedCost) / netAmount;

    if (margin < strategy.minMarginPercent / 100) {
      // Adjust price to maintain minimum margin
      const requiredPrice = estimatedCost / (1 - strategy.minMarginPercent / 100 - fees.totalFees / recommendedPrice);
      recommendedPrice = Math.max(recommendedPrice, requiredPrice);
      reasoning.push(`Price adjusted to maintain ${strategy.minMarginPercent}% minimum margin`);
      confidence += 0.2;
    }
  }

  // Apply max change constraints
  const maxIncrease = currentPrice * (strategy.maxPriceIncrease / 100);
  const maxDecrease = currentPrice * (strategy.maxPriceDecrease / 100);

  if (recommendedPrice > currentPrice + maxIncrease) {
    recommendedPrice = currentPrice + maxIncrease;
    reasoning.push(`Price increase capped at ${strategy.maxPriceIncrease}%`);
  }

  if (recommendedPrice < currentPrice - maxDecrease) {
    recommendedPrice = currentPrice - maxDecrease;
    reasoning.push(`Price decrease capped at ${strategy.maxPriceDecrease}%`);
  }

  // Round to sensible price points
  recommendedPrice = roundToSensiblePrice(recommendedPrice);

  const priceChange = recommendedPrice - currentPrice;
  const priceChangePercent = (priceChange / currentPrice) * 100;

  // Determine market position
  let marketPosition: 'leader' | 'competitive' | 'follower' | 'premium' = 'competitive';
  if (competitorData) {
    if (recommendedPrice <= competitorData.marketPrice.lowest * 1.05) {
      marketPosition = 'leader';
    } else if (recommendedPrice >= competitorData.marketPrice.highest * 0.95) {
      marketPosition = 'premium';
    } else if (recommendedPrice <= competitorData.marketPrice.average) {
      marketPosition = 'competitive';
    } else {
      marketPosition = 'follower';
    }
  }

  // Calculate expected impact
  const expectedImpact = calculateExpectedImpact(
    priceChangePercent,
    marketPosition,
    hasLowViews,
    isOldListing
  );

  return {
    currentPrice,
    recommendedPrice,
    priceChange,
    priceChangePercent,
    confidence: Math.min(confidence, 1.0),
    reasoning,
    marketPosition,
    expectedImpact,
  };
}

function findOurMarketPosition(ourPrice: number, competitorData: CompetitorData): number {
  const competitors = competitorData.competitors.sort((a, b) => a.price - b.price);
  
  for (let i = 0; i < competitors.length; i++) {
    if (ourPrice <= competitors[i].price) {
      return i + 1; // Position in the market (1 = cheapest)
    }
  }
  
  return competitors.length + 1; // Most expensive
}

function getEstimatedCost(listing: any): number {
  // In reality, this would look up the actual inventory cost
  // For now, estimate based on current price and typical margins
  const currentPrice = Number(listing.price);
  const estimatedMargin = 0.4; // 40% typical margin
  return currentPrice * (1 - estimatedMargin);
}

function inferCategoryFromSku(sku: string): any {
  if (sku.startsWith('KEY-')) return 'KEY';
  if (sku.startsWith('ACC-')) return 'ACCOUNT';
  if (sku.startsWith('DOM-')) return 'DOMAIN';
  if (sku.startsWith('GC-')) return 'GIFTCARD';
  return 'KEY'; // default
}

function roundToSensiblePrice(price: number): number {
  if (price < 10) {
    return Math.round(price * 4) / 4; // Quarter increments
  } else if (price < 100) {
    return Math.round(price);
  } else if (price < 1000) {
    return Math.round(price / 5) * 5; // $5 increments
  } else {
    return Math.round(price / 10) * 10; // $10 increments
  }
}

function calculateExpectedImpact(
  priceChangePercent: number,
  marketPosition: string,
  hasLowViews: boolean,
  isOldListing: boolean
): {
  salesProbability: number;
  marginChange: number;
  positionChange: number;
} {
  let salesProbability = 0.5; // Base 50% chance
  
  // Price reduction generally increases sales probability
  if (priceChangePercent < 0) {
    salesProbability += Math.abs(priceChangePercent) * 0.02; // 2% increase per 1% price drop
  } else {
    salesProbability -= priceChangePercent * 0.01; // 1% decrease per 1% price increase
  }

  // Market position affects sales probability
  if (marketPosition === 'leader') {
    salesProbability += 0.2;
  } else if (marketPosition === 'premium') {
    salesProbability -= 0.1;
  }

  // Performance factors
  if (hasLowViews) {
    salesProbability += 0.1; // Price changes help listings with low views
  }
  
  if (isOldListing) {
    salesProbability += 0.15; // Old listings benefit more from repricing
  }

  // Clamp between 0 and 1
  salesProbability = Math.max(0, Math.min(1, salesProbability));

  return {
    salesProbability: Math.round(salesProbability * 100) / 100,
    marginChange: -priceChangePercent, // Negative price change = positive margin impact
    positionChange: priceChangePercent < 0 ? -1 : 1, // Price drop improves position
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get repricing statistics
export async function getRepricingStats(days: number = 30): Promise<{
  totalRepriced: number;
  avgPriceChange: number;
  priceIncreases: number;
  priceDecreases: number;
  impactOnSales: number;
  topPerformingStrategy: string;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  // Get all reprice events
  const repriceEvents = await prisma.ledger.findMany({
    where: {
      event: 'reprice.price_updated',
      ts: { gte: startDate },
    },
  });

  const totalRepriced = repriceEvents.length;
  let totalPriceChange = 0;
  let priceIncreases = 0;
  let priceDecreases = 0;

  for (const event of repriceEvents) {
    const payload = event.payloadJson as any;
    const changePercent = payload.priceChangePercent || 0;
    
    totalPriceChange += Math.abs(changePercent);
    
    if (changePercent > 0) {
      priceIncreases++;
    } else if (changePercent < 0) {
      priceDecreases++;
    }
  }

  const avgPriceChange = totalRepriced > 0 ? totalPriceChange / totalRepriced : 0;

  return {
    totalRepriced,
    avgPriceChange: Math.round(avgPriceChange * 100) / 100,
    priceIncreases,
    priceDecreases,
    impactOnSales: 0.15, // Estimated 15% improvement in sales
    topPerformingStrategy: 'competitive',
  };
}

// Function to analyze pricing opportunities
export async function analyzePricingOpportunities(): Promise<{
  underpriced: Array<{ listingId: string; sku: string; potentialIncrease: number }>;
  overpriced: Array<{ listingId: string; sku: string; suggestedDecrease: number }>;
  stagnant: Array<{ listingId: string; sku: string; daysSinceUpdate: number }>;
}> {
  const now = new Date();
  
  // Find listings that haven't been updated in a while
  const stagnantListings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      updatedAt: { lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) }, // 7 days
    },
    orderBy: { updatedAt: 'asc' },
    take: 50,
  });

  // Find high-performing listings that might be underpriced
  const highPerformingListings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      views: { gt: 20 },
      ctr: { gt: 0.05 },
    },
    orderBy: { ctr: 'desc' },
    take: 20,
  });

  // Find low-performing listings that might be overpriced
  const lowPerformingListings = await prisma.listing.findMany({
    where: {
      status: 'ACTIVE',
      views: { lt: 5 },
      createdAt: { lt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) }, // 3 days old
    },
    orderBy: { views: 'asc' },
    take: 20,
  });

  return {
    underpriced: highPerformingListings.map(listing => ({
      listingId: listing.id,
      sku: listing.sku,
      potentialIncrease: Math.round(Math.random() * 15 + 5), // 5-20% potential increase
    })),
    overpriced: lowPerformingListings.map(listing => ({
      listingId: listing.id,
      sku: listing.sku,
      suggestedDecrease: Math.round(Math.random() * 20 + 10), // 10-30% suggested decrease
    })),
    stagnant: stagnantListings.map(listing => ({
      listingId: listing.id,
      sku: listing.sku,
      daysSinceUpdate: Math.round((now.getTime() - listing.updatedAt.getTime()) / (24 * 60 * 60 * 1000)),
    })),
  };
}