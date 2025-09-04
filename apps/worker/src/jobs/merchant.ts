import { Job } from 'bullmq';
import { prisma, Marketplace, InventoryStatus, ListingStatus, InventoryKind } from '@yahuti/db';
import { createLogger } from '../utils/logger';
import { MarketplaceClient } from '../services/marketplace-client';
import { FeeCalculator } from '../services/fee-calculator';

const logger = createLogger('Merchant');

export interface MerchantJobData {
  inventoryId?: string;
  batchSize?: number;
  marketplace?: Marketplace;
  forceReprice?: boolean;
  dryRun?: boolean;
}

export interface ListingStrategy {
  priceStrategy: 'competitive' | 'premium' | 'quick_flip' | 'margin_protect';
  startPrice: number;
  reservePrice: number;
  buyNowPrice?: number;
  duration: number; // days
  autoRelist: boolean;
  promotionLevel: 'none' | 'basic' | 'premium';
  categoryOverrides?: Record<InventoryKind, Partial<ListingStrategy>>;
}

export interface ListingTemplate {
  titleTemplate: string;
  descriptionTemplate: string;
  tags: string[];
  category: string;
  attributes: Record<string, string>;
  images?: string[];
}

const DEFAULT_LISTING_STRATEGY: ListingStrategy = {
  priceStrategy: 'competitive',
  startPrice: 0, // Will be calculated
  reservePrice: 0, // Will be calculated
  duration: 7,
  autoRelist: true,
  promotionLevel: 'basic',
  categoryOverrides: {
    'KEY': {
      priceStrategy: 'quick_flip',
      duration: 5,
    },
    'ACCOUNT': {
      priceStrategy: 'premium',
      duration: 10,
      promotionLevel: 'premium',
    },
    'DOMAIN': {
      priceStrategy: 'margin_protect',
      duration: 14,
      promotionLevel: 'none',
    },
    'GIFTCARD': {
      priceStrategy: 'competitive',
      duration: 3,
    },
  },
};

// Listing templates for different categories
const LISTING_TEMPLATES: Record<InventoryKind, ListingTemplate> = {
  'KEY': {
    titleTemplate: '{gameTitle} - {platform} Game Key - Instant Delivery',
    descriptionTemplate: `🎮 **{gameTitle} Game Key**

✅ **INSTANT DELIVERY** - Automated delivery within minutes
🔑 **GLOBAL KEY** - Works worldwide (unless specified)
🛡️ **100% GUARANTEED** - Full refund if key doesn't work
⚡ **24/7 SUPPORT** - Fast customer service

**What you get:**
- Original game key for {platform}
- Digital delivery to your email
- Activation instructions included

**How it works:**
1. Complete payment
2. Receive key instantly via email
3. Activate on {platform}
4. Start playing!

⭐ **Why choose us?**
- Over 10,000+ happy customers
- 99.8% positive feedback
- Professional game key seller since 2020

*Please check system requirements before purchasing. No refunds for compatibility issues.*`,
    tags: ['game key', 'instant delivery', 'digital download', 'pc gaming'],
    category: 'Video Games & Consoles',
    attributes: {
      platform: 'PC',
      delivery: 'Digital',
      condition: 'New',
      type: 'Game Key',
    },
  },
  'ACCOUNT': {
    titleTemplate: '{serviceTitle} Account - {accountLevel} - {region} Region',
    descriptionTemplate: `🎯 **Premium {serviceTitle} Account**

🔥 **ACCOUNT DETAILS:**
- Service: {serviceTitle}
- Level/Tier: {accountLevel}
- Region: {region}
- Created: {accountAge}

✅ **WHAT'S INCLUDED:**
- Full account access (email + password)
- All progress and unlocks intact
- Clean account history
- Change email/password instructions

🛡️ **GUARANTEE:**
- Account works as described or full refund
- 24-hour support included
- No bans or warnings

⚠️ **IMPORTANT:**
- Change password immediately after purchase
- Enable 2FA for security
- Account sharing violates most ToS - use at own risk

📧 **DELIVERY:**
Account details sent via secure message within 1-24 hours.

*By purchasing, you acknowledge this may violate the original service's Terms of Service.*`,
    tags: ['gaming account', 'premium account', 'digital goods', 'online gaming'],
    category: 'Video Games & Consoles',
    attributes: {
      type: 'Account',
      condition: 'Used',
      delivery: 'Digital',
    },
  },
  'DOMAIN': {
    titleTemplate: '{domainName} - Premium Domain Name - {extension} - {category}',
    descriptionTemplate: `🌐 **Premium Domain: {domainName}**

📊 **DOMAIN STATS:**
- Age: {domainAge}
- Extension: {extension}
- Length: {domainLength} characters
- Category: {category}

💎 **VALUE PROPOSITION:**
- Memorable and brandable
- SEO-friendly name
- {trafficStats}
- {backlinkStats}

🔄 **TRANSFER PROCESS:**
1. Payment confirmation
2. Domain unlock and auth code provided
3. Transfer initiated to your registrar
4. Transfer completed (5-7 days)

✅ **INCLUDED:**
- Full ownership transfer
- Transfer assistance
- 60-day transfer support

📈 **PERFECT FOR:**
- Business websites
- Personal branding
- Investment portfolio
- Startup companies

*Transfer fees (if any) are covered by buyer. Domain must be transferred within 30 days.*`,
    tags: ['domain name', 'premium domain', 'web address', 'digital asset'],
    category: 'Business & Industrial',
    attributes: {
      type: 'Domain Name',
      condition: 'Used',
      age: 'Established',
    },
  },
  'GIFTCARD': {
    titleTemplate: '{brand} Gift Card - ${amount} Value - Digital Delivery',
    descriptionTemplate: `💳 **{brand} Gift Card - ${amount}**

🎁 **GIFT CARD DETAILS:**
- Brand: {brand}
- Value: ${amount} USD
- Format: Digital code
- Expiry: {expiryInfo}

⚡ **INSTANT DELIVERY:**
- Automated delivery system
- Code sent within 5 minutes
- Available 24/7

✅ **GUARANTEE:**
- Valid, unused gift card codes
- Full refund if code invalid
- Customer support included

🛍️ **HOW TO USE:**
1. Receive code via email/message
2. Visit {brand} website or store
3. Enter code at checkout
4. Enjoy your purchase!

🔒 **SECURITY:**
- Codes sourced from authorized retailers
- Scratch-off protection preserved
- Receipt available upon request

*Perfect as gifts or for personal use. No cash value, non-refundable once redeemed.*`,
    tags: ['gift card', 'digital gift card', 'instant delivery', 'online shopping'],
    category: 'Gift Cards & Vouchers',
    attributes: {
      type: 'Gift Card',
      delivery: 'Digital',
      condition: 'New',
    },
  },
  'SUBSCRIPTION': {
    titleTemplate: '{serviceTitle} Subscription - {duration} - Premium Access',
    descriptionTemplate: `🔥 **{serviceTitle} Premium Subscription**

⏰ **SUBSCRIPTION DETAILS:**
- Service: {serviceTitle}
- Duration: {duration}
- Access Level: Premium/Pro
- Activation: Immediate

🚀 **PREMIUM FEATURES:**
{featureList}

📱 **COMPATIBILITY:**
- All devices supported
- Worldwide access
- No geographical restrictions

🔄 **ACTIVATION PROCESS:**
1. Purchase confirmation
2. Account details provided
3. Login and enjoy premium features
4. Support available if needed

✅ **GUARANTEE:**
- Working subscription or full refund
- 24-hour customer support
- Replacement if account issues occur

⚠️ **IMPORTANT NOTES:**
- Shared account access
- Don't change account details
- Use responsibly per ToS

*Subscription starts immediately upon delivery. No refunds after successful login.*`,
    tags: ['subscription', 'premium access', 'streaming', 'digital service'],
    category: 'Digital Services',
    attributes: {
      type: 'Subscription',
      duration: 'Limited',
      condition: 'New',
    },
  },
};

export async function merchantJob(job: Job<MerchantJobData>) {
  const {
    inventoryId,
    batchSize = 20,
    marketplace,
    forceReprice = false,
    dryRun = false
  } = job.data;

  logger.info('Starting marketplace listing job', {
    inventoryId,
    batchSize,
    marketplace,
    forceReprice,
    dryRun,
  });

  try {
    let inventoryItems;
    let totalItems;

    if (inventoryId) {
      // List specific inventory item
      const item = await prisma.inventory.findUnique({
        where: { 
          id: inventoryId,
          status: 'AVAILABLE',
        },
      });

      if (!item) {
        throw new Error(`Available inventory item ${inventoryId} not found`);
      }

      inventoryItems = [item];
      totalItems = 1;
    } else {
      // List batch of available inventory
      const whereClause: any = {
        status: 'AVAILABLE',
      };

      // Only list items without active listings (unless forcing reprice)
      if (!forceReprice) {
        whereClause.listings = {
          none: {
            status: { in: ['ACTIVE'] },
          },
        };
      }

      inventoryItems = await prisma.inventory.findMany({
        where: whereClause,
        include: {
          listings: {
            where: { status: 'ACTIVE' },
          },
        },
        take: batchSize,
        orderBy: [
          { createdAt: 'asc' }, // FIFO
        ],
      });
      totalItems = inventoryItems.length;
    }

    if (inventoryItems.length === 0) {
      logger.info('No inventory items to list');
      return {
        success: true,
        totalItems: 0,
        listed: 0,
        updated: 0,
        failed: 0,
        dryRun,
      };
    }

    logger.info(`Found ${inventoryItems.length} inventory items to list`);

    // Update job progress
    await job.updateProgress(10);

    const feeCalculator = FeeCalculator.getInstance();
    let listedCount = 0;
    let updatedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < inventoryItems.length; i++) {
      const item = inventoryItems[i];
      
      logger.info(`Processing inventory item ${item.sku}`, {
        kind: item.kind,
        cost: item.cost,
        status: item.status,
      });

      try {
        // Determine target marketplaces
        const targetMarketplaces = marketplace ? 
          [marketplace] : 
          await getOptimalMarketplaces(item, feeCalculator);

        for (const mp of targetMarketplaces) {
          const client = new MarketplaceClient(mp);
          
          // Check if item already has active listing on this marketplace
          const existingListing = item.listings?.find(l => 
            l.marketplace === mp && l.status === 'ACTIVE'
          );

          if (existingListing && !forceReprice) {
            logger.debug(`Item ${item.sku} already listed on ${mp}`, {
              listingId: existingListing.id,
              price: existingListing.price,
            });
            continue;
          }

          // Generate listing data
          const listingData = await generateListingData(item, mp);
          
          if (existingListing && forceReprice) {
            // Update existing listing price
            const updateResult = await client.updatePrice(
              existingListing.variantId || existingListing.id,
              listingData.price
            );

            if (updateResult.success && !dryRun) {
              await prisma.listing.update({
                where: { id: existingListing.id },
                data: {
                  price: listingData.price,
                  updatedAt: new Date(),
                },
              });
              updatedCount++;
              logger.info(`Updated price for ${item.sku} on ${mp}`, {
                oldPrice: updateResult.oldPrice,
                newPrice: updateResult.newPrice,
              });
            }
          } else {
            // Create new listing
            const result = await client.createListing(listingData);

            if (result.success && !dryRun) {
              // Create listing record in database
              await prisma.listing.create({
                data: {
                  marketplace: mp,
                  sku: item.sku,
                  title: listingData.title,
                  description: listingData.description,
                  price: listingData.price,
                  floor: calculateFloorPrice(Number(item.cost), mp),
                  ceiling: calculateCeilingPrice(listingData.price, mp),
                  variantId: result.marketplaceId,
                  status: 'ACTIVE',
                },
              });

              listedCount++;
              logger.info(`Listed ${item.sku} on ${mp}`, {
                listingId: result.listingId,
                price: listingData.price,
                fees: result.fees,
              });
            } else if (!result.success) {
              failedCount++;
              logger.error(`Failed to list ${item.sku} on ${mp}: ${result.error}`);
            }
          }

          // Small delay between marketplace API calls
          await delay(500 + Math.random() * 1000);
        }

        // Update progress
        const progress = 10 + ((i + 1) / inventoryItems.length) * 85;
        await job.updateProgress(Math.round(progress));

      } catch (error) {
        failedCount++;
        logger.error(`Failed to process inventory item ${item.sku}:`, error);

        // Log failure
        if (!dryRun) {
          await prisma.ledger.create({
            data: {
              event: 'merchant.listing_failed',
              payloadJson: {
                inventoryId: item.id,
                sku: item.sku,
                error: error.message,
                timestamp: new Date().toISOString(),
              },
              actor: 'merchant',
            },
          });
        }
      }
    }

    // Log merchant summary
    await prisma.ledger.create({
      data: {
        event: 'merchant.batch_completed',
        payloadJson: {
          totalItems: inventoryItems.length,
          listed: listedCount,
          updated: updatedCount,
          failed: failedCount,
          marketplace: marketplace || 'multiple',
          forceReprice,
          dryRun,
          timestamp: new Date().toISOString(),
        },
        actor: 'merchant',
      },
    });

    await job.updateProgress(100);

    const result = {
      success: true,
      totalItems: inventoryItems.length,
      listed: listedCount,
      updated: updatedCount,
      failed: failedCount,
      successRate: inventoryItems.length > 0 ? (listedCount + updatedCount) / inventoryItems.length : 0,
      dryRun,
    };

    logger.info('Merchant job completed', result);
    return result;

  } catch (error) {
    logger.error('Merchant job failed:', error);
    
    // Log failure
    await prisma.ledger.create({
      data: {
        event: 'merchant.job_failed',
        payloadJson: {
          inventoryId,
          batchSize,
          marketplace,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        actor: 'merchant',
      },
    });

    throw error;
  }
}

async function getOptimalMarketplaces(
  item: any,
  feeCalculator: FeeCalculator
): Promise<Marketplace[]> {
  const estimatedPrice = calculateOptimalPrice(Number(item.cost), item.kind);
  
  // Compare marketplaces for this item
  const comparison = feeCalculator.compareMarketplaces(
    estimatedPrice,
    item.kind
  );

  // Return top 2-3 marketplaces that support this category
  return comparison
    .filter(c => c.supported)
    .slice(0, 3)
    .map(c => c.marketplace);
}

async function generateListingData(item: any, marketplace: Marketplace): Promise<{
  sku: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  attributes: Record<string, string>;
}> {
  const template = LISTING_TEMPLATES[item.kind as InventoryKind];
  const strategy = getListingStrategy(item.kind);
  
  // Calculate optimal price
  const price = calculateOptimalPrice(Number(item.cost), item.kind, strategy.priceStrategy);
  
  // Generate title from template
  const title = template.titleTemplate
    .replace('{gameTitle}', extractGameTitle(item.sku))
    .replace('{platform}', extractPlatform(item.sku))
    .replace('{serviceTitle}', extractServiceTitle(item.sku))
    .replace('{domainName}', extractDomainName(item.sku))
    .replace('{brand}', extractBrand(item.sku))
    .replace('{amount}', extractAmount(item.sku))
    .replace('{extension}', extractDomainExtension(item.sku))
    .replace('{category}', getCategoryName(item.kind));

  // Generate description from template
  const description = template.descriptionTemplate
    .replace(/{gameTitle}/g, extractGameTitle(item.sku))
    .replace(/{platform}/g, extractPlatform(item.sku))
    .replace(/{serviceTitle}/g, extractServiceTitle(item.sku))
    .replace(/{domainName}/g, extractDomainName(item.sku))
    .replace(/{brand}/g, extractBrand(item.sku))
    .replace(/{amount}/g, extractAmount(item.sku))
    .replace(/{featureList}/g, generateFeatureList(item.kind))
    .replace(/{accountLevel}/g, extractAccountLevel(item.sku))
    .replace(/{region}/g, 'Global')
    .replace(/{accountAge}/g, 'Recent')
    .replace(/{duration}/g, extractDuration(item.sku))
    .replace(/{expiryInfo}/g, 'No expiry')
    .replace(/{category}/g, getCategoryName(item.kind));

  return {
    sku: item.sku,
    title: title.slice(0, 80), // Truncate for marketplace limits
    description,
    price,
    quantity: 1,
    category: template.category,
    attributes: template.attributes,
  };
}

function getListingStrategy(kind: InventoryKind): ListingStrategy {
  const override = DEFAULT_LISTING_STRATEGY.categoryOverrides?.[kind];
  return { ...DEFAULT_LISTING_STRATEGY, ...override };
}

function calculateOptimalPrice(
  cost: number,
  kind: InventoryKind,
  strategy: string = 'competitive'
): number {
  let markup: number;

  switch (strategy) {
    case 'quick_flip':
      markup = 1.3 + Math.random() * 0.2; // 30-50% markup
      break;
    case 'premium':
      markup = 1.8 + Math.random() * 0.7; // 80-250% markup
      break;
    case 'margin_protect':
      markup = 1.5 + Math.random() * 0.3; // 50-80% markup
      break;
    case 'competitive':
    default:
      markup = 1.4 + Math.random() * 0.4; // 40-80% markup
      break;
  }

  // Adjust markup based on category
  const categoryAdjustments = {
    'KEY': 1.0,
    'ACCOUNT': 1.3, // Higher margins for accounts
    'DOMAIN': 2.0, // Much higher margins for domains
    'GIFTCARD': 0.8, // Lower margins for gift cards
    'SUBSCRIPTION': 1.2,
  };

  const adjustedMarkup = markup * (categoryAdjustments[kind] || 1.0);
  const price = cost * adjustedMarkup;

  // Round to sensible price points
  if (price < 10) {
    return Math.round(price * 4) / 4; // Quarter increments
  } else if (price < 100) {
    return Math.round(price);
  } else {
    return Math.round(price / 5) * 5; // $5 increments
  }
}

function calculateFloorPrice(cost: number, marketplace: Marketplace): number {
  const minMargin = 0.15; // 15% minimum margin
  const feeCalculator = FeeCalculator.getInstance();
  
  // Estimate fees at cost price
  const estimatedFees = feeCalculator.estimateQuickFees(marketplace, cost * 1.2);
  const minPrice = (cost + estimatedFees) / (1 - minMargin);
  
  return Math.round(minPrice * 100) / 100;
}

function calculateCeilingPrice(basePrice: number, marketplace: Marketplace): number {
  // Ceiling is typically 50-100% higher than base price
  const multiplier = 1.5 + Math.random() * 0.5;
  return Math.round(basePrice * multiplier * 100) / 100;
}

// Helper functions to extract information from SKUs
function extractGameTitle(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1].replace(/_/g, ' ') : 'Unknown Game';
}

function extractPlatform(sku: string): string {
  if (sku.includes('STEAM')) return 'Steam';
  if (sku.includes('XBOX')) return 'Xbox';
  if (sku.includes('PSN')) return 'PlayStation';
  return 'PC';
}

function extractServiceTitle(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1].replace(/_/g, ' ') : 'Premium Service';
}

function extractDomainName(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1].toLowerCase() + '.com' : 'example.com';
}

function extractBrand(sku: string): string {
  const parts = sku.split('-');
  return parts.length > 1 ? parts[1] : 'Popular Brand';
}

function extractAmount(sku: string): string {
  const match = sku.match(/\d+/);
  return match ? match[0] : '25';
}

function extractDomainExtension(sku: string): string {
  return '.com'; // Default extension
}

function extractAccountLevel(sku: string): string {
  if (sku.includes('PREMIUM')) return 'Premium';
  if (sku.includes('PRO')) return 'Pro';
  if (sku.includes('VIP')) return 'VIP';
  return 'Standard';
}

function extractDuration(sku: string): string {
  if (sku.includes('12M')) return '12 months';
  if (sku.includes('6M')) return '6 months';
  if (sku.includes('3M')) return '3 months';
  return '1 month';
}

function generateFeatureList(kind: InventoryKind): string {
  const features = {
    'KEY': '- Full game access\n- All DLC included\n- Lifetime ownership',
    'ACCOUNT': '- All progress preserved\n- Premium features unlocked\n- Clean history',
    'DOMAIN': '- Full ownership transfer\n- SEO value included\n- Professional support',
    'GIFTCARD': '- No expiry date\n- Works nationwide\n- Instant activation',
    'SUBSCRIPTION': '- All premium features\n- Multi-device access\n- Priority support',
  };
  
  return features[kind] || '- Premium access\n- Full features\n- Customer support';
}

function getCategoryName(kind: InventoryKind): string {
  const categories = {
    'KEY': 'Game Keys',
    'ACCOUNT': 'Gaming Accounts',
    'DOMAIN': 'Domain Names',
    'GIFTCARD': 'Gift Cards',
    'SUBSCRIPTION': 'Digital Services',
  };
  
  return categories[kind] || 'Digital Goods';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to get listing performance stats
export async function getListingStats(days: number = 30): Promise<{
  totalListings: number;
  activeListings: number;
  soldListings: number;
  avgPrice: number;
  bestPerformingMarketplace: string;
  conversionRate: number;
}> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const [totalListings, activeListings, soldListings, avgPriceResult] = await Promise.all([
    prisma.listing.count({
      where: { createdAt: { gte: startDate } },
    }),
    prisma.listing.count({
      where: { 
        createdAt: { gte: startDate },
        status: 'ACTIVE',
      },
    }),
    prisma.listing.count({
      where: { 
        createdAt: { gte: startDate },
        status: 'SOLD',
      },
    }),
    prisma.listing.aggregate({
      where: { createdAt: { gte: startDate } },
      _avg: { price: true },
    }),
  ]);

  // Get marketplace performance
  const marketplaceStats = await prisma.listing.groupBy({
    by: ['marketplace'],
    where: { 
      createdAt: { gte: startDate },
      status: 'SOLD',
    },
    _count: true,
  });

  const bestPerformingMarketplace = marketplaceStats
    .sort((a, b) => b._count - a._count)[0]?.marketplace || 'EBAY';

  return {
    totalListings,
    activeListings,
    soldListings,
    avgPrice: Number(avgPriceResult._avg.price) || 0,
    bestPerformingMarketplace,
    conversionRate: totalListings > 0 ? soldListings / totalListings : 0,
  };
}