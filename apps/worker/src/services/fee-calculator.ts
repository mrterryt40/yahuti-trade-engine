import { Marketplace, InventoryKind } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('FeeCalculator');

export interface FeeBreakdown {
  listingFee: number;
  finalValueFee: number;
  paymentProcessingFee: number;
  shippingFee: number;
  advertisingFee: number;
  totalFees: number;
  netAmount: number;
}

export interface FeeCalculationInput {
  marketplace: Marketplace;
  category: InventoryKind;
  salePrice: number;
  isPromoted?: boolean;
  shippingCost?: number;
  paymentMethod?: 'paypal' | 'credit_card' | 'managed_payments';
}

export interface MarketplaceFeeStructure {
  name: string;
  listingFee: {
    fixed: number;
    percent: number;
  };
  finalValueFee: {
    percent: number;
    max?: number;
    min?: number;
  };
  paymentProcessing: {
    percent: number;
    fixed: number;
  };
  promotionFee?: {
    percent: number;
  };
  categoryMultipliers?: Record<InventoryKind, number>;
}

const MARKETPLACE_FEE_STRUCTURES: Record<Marketplace, MarketplaceFeeStructure> = {
  EBAY: {
    name: 'eBay',
    listingFee: { fixed: 0, percent: 0 },
    finalValueFee: { percent: 12.9, max: 750 },
    paymentProcessing: { percent: 2.9, fixed: 0.30 },
    promotionFee: { percent: 2.0 },
    categoryMultipliers: {
      KEY: 1.0,
      ACCOUNT: 1.0,
      GIFTCARD: 0.8, // Lower fees for gift cards
      DOMAIN: 1.2,
      SUBSCRIPTION: 1.0,
    },
  },
  AMAZON: {
    name: 'Amazon',
    listingFee: { fixed: 0, percent: 0 },
    finalValueFee: { percent: 15.0 },
    paymentProcessing: { percent: 0, fixed: 0 }, // Included in FVF
    categoryMultipliers: {
      KEY: 1.0,
      ACCOUNT: 1.5, // Higher fees for accounts
      GIFTCARD: 0.6,
      DOMAIN: 2.0, // Much higher for domains
      SUBSCRIPTION: 1.2,
    },
  },
  GODADDY: {
    name: 'GoDaddy Auctions',
    listingFee: { fixed: 0, percent: 0 },
    finalValueFee: { percent: 20.0 },
    paymentProcessing: { percent: 2.9, fixed: 0.30 },
    categoryMultipliers: {
      DOMAIN: 1.0, // Only supports domains
      KEY: 999, // Effectively unsupported
      ACCOUNT: 999,
      GIFTCARD: 999,
      SUBSCRIPTION: 999,
    },
  },
  NAMECHEAP: {
    name: 'Namecheap',
    listingFee: { fixed: 0, percent: 0 },
    finalValueFee: { percent: 18.0 },
    paymentProcessing: { percent: 2.9, fixed: 0.30 },
    categoryMultipliers: {
      DOMAIN: 1.0, // Only supports domains
      KEY: 999, // Effectively unsupported
      ACCOUNT: 999,
      GIFTCARD: 999,
      SUBSCRIPTION: 999,
    },
  },
  G2G: {
    name: 'G2G',
    listingFee: { fixed: 0, percent: 0 },
    finalValueFee: { percent: 10.9 },
    paymentProcessing: { percent: 2.5, fixed: 0.25 },
    promotionFee: { percent: 3.0 },
    categoryMultipliers: {
      KEY: 1.0,
      ACCOUNT: 1.0,
      GIFTCARD: 1.2,
      DOMAIN: 999, // Not supported
      SUBSCRIPTION: 1.0,
    },
  },
  PLAYERAUCTIONS: {
    name: 'PlayerAuctions',
    listingFee: { fixed: 0, percent: 0 },
    finalValueFee: { percent: 11.9 },
    paymentProcessing: { percent: 2.4, fixed: 0.30 },
    promotionFee: { percent: 2.5 },
    categoryMultipliers: {
      KEY: 1.0,
      ACCOUNT: 1.0,
      GIFTCARD: 1.5,
      DOMAIN: 999, // Not supported
      SUBSCRIPTION: 1.0,
    },
  },
};

export class FeeCalculator {
  private static instance: FeeCalculator;

  static getInstance(): FeeCalculator {
    if (!FeeCalculator.instance) {
      FeeCalculator.instance = new FeeCalculator();
    }
    return FeeCalculator.instance;
  }

  constructor() {
    logger.info('Fee calculator initialized');
  }

  calculateFees(input: FeeCalculationInput): FeeBreakdown {
    logger.debug('Calculating fees', {
      marketplace: input.marketplace,
      category: input.category,
      salePrice: input.salePrice,
    });

    const structure = MARKETPLACE_FEE_STRUCTURES[input.marketplace];
    if (!structure) {
      throw new Error(`Unsupported marketplace: ${input.marketplace}`);
    }

    // Get category multiplier
    const categoryMultiplier = structure.categoryMultipliers?.[input.category] || 1.0;
    
    if (categoryMultiplier > 10) {
      throw new Error(`Category ${input.category} not supported on ${structure.name}`);
    }

    // Calculate listing fee
    const listingFee = structure.listingFee.fixed + 
      (input.salePrice * structure.listingFee.percent / 100);

    // Calculate final value fee with category multiplier
    let finalValueFee = input.salePrice * 
      (structure.finalValueFee.percent * categoryMultiplier) / 100;
    
    // Apply FVF caps if they exist
    if (structure.finalValueFee.max) {
      finalValueFee = Math.min(finalValueFee, structure.finalValueFee.max);
    }
    if (structure.finalValueFee.min) {
      finalValueFee = Math.max(finalValueFee, structure.finalValueFee.min);
    }

    // Calculate payment processing fee
    const paymentProcessingFee = input.paymentMethod !== undefined ?
      this.calculatePaymentProcessingFee(input.salePrice, input.paymentMethod, structure) :
      input.salePrice * structure.paymentProcessing.percent / 100 + 
      structure.paymentProcessing.fixed;

    // Calculate shipping fee (if applicable)
    const shippingFee = input.shippingCost || 0;

    // Calculate advertising/promotion fee
    const advertisingFee = (input.isPromoted && structure.promotionFee) ?
      input.salePrice * structure.promotionFee.percent / 100 : 0;

    // Calculate totals
    const totalFees = listingFee + finalValueFee + paymentProcessingFee + 
                     shippingFee + advertisingFee;
    const netAmount = input.salePrice - totalFees;

    const breakdown: FeeBreakdown = {
      listingFee: Math.round(listingFee * 100) / 100,
      finalValueFee: Math.round(finalValueFee * 100) / 100,
      paymentProcessingFee: Math.round(paymentProcessingFee * 100) / 100,
      shippingFee: Math.round(shippingFee * 100) / 100,
      advertisingFee: Math.round(advertisingFee * 100) / 100,
      totalFees: Math.round(totalFees * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
    };

    logger.debug('Fee calculation completed', {
      marketplace: input.marketplace,
      category: input.category,
      salePrice: input.salePrice,
      totalFees: breakdown.totalFees,
      netAmount: breakdown.netAmount,
    });

    return breakdown;
  }

  calculateNetMargin(costPrice: number, salePrice: number, input: FeeCalculationInput): {
    grossProfit: number;
    netProfit: number;
    marginPercent: number;
    roiPercent: number;
    fees: FeeBreakdown;
  } {
    const fees = this.calculateFees({ ...input, salePrice });
    
    const grossProfit = salePrice - costPrice;
    const netProfit = fees.netAmount - costPrice;
    const marginPercent = netProfit / salePrice * 100;
    const roiPercent = netProfit / costPrice * 100;

    return {
      grossProfit: Math.round(grossProfit * 100) / 100,
      netProfit: Math.round(netProfit * 100) / 100,
      marginPercent: Math.round(marginPercent * 100) / 100,
      roiPercent: Math.round(roiPercent * 100) / 100,
      fees,
    };
  }

  compareMarketplaces(
    salePrice: number,
    category: InventoryKind,
    options: { isPromoted?: boolean; shippingCost?: number } = {}
  ): Array<{
    marketplace: Marketplace;
    fees: FeeBreakdown;
    supported: boolean;
    rank: number;
  }> {
    const results: Array<{
      marketplace: Marketplace;
      fees?: FeeBreakdown;
      supported: boolean;
      rank: number;
    }> = [];

    Object.keys(MARKETPLACE_FEE_STRUCTURES).forEach((marketplace) => {
      const mp = marketplace as Marketplace;
      
      try {
        const fees = this.calculateFees({
          marketplace: mp,
          category,
          salePrice,
          isPromoted: options.isPromoted,
          shippingCost: options.shippingCost,
        });

        results.push({
          marketplace: mp,
          fees,
          supported: true,
          rank: 0, // Will be set after sorting
        });

      } catch (error) {
        results.push({
          marketplace: mp,
          supported: false,
          rank: 999,
        });
      }
    });

    // Sort by net amount descending (highest net profit first)
    const sortedResults = results
      .filter(r => r.supported)
      .sort((a, b) => b.fees!.netAmount - a.fees!.netAmount)
      .map((r, index) => ({ ...r, rank: index + 1 }));

    // Add unsupported marketplaces at the end
    const unsupportedResults = results
      .filter(r => !r.supported)
      .map(r => ({ ...r, fees: undefined as any }));

    return [...sortedResults, ...unsupportedResults];
  }

  getMarketplaceFeeStructure(marketplace: Marketplace): MarketplaceFeeStructure {
    return MARKETPLACE_FEE_STRUCTURES[marketplace];
  }

  getSupportedCategories(marketplace: Marketplace): InventoryKind[] {
    const structure = MARKETPLACE_FEE_STRUCTURES[marketplace];
    if (!structure.categoryMultipliers) {
      return Object.values(InventoryKind);
    }

    return Object.entries(structure.categoryMultipliers)
      .filter(([_, multiplier]) => multiplier < 10) // Filter out effectively unsupported categories
      .map(([category, _]) => category as InventoryKind);
  }

  calculateBreakEvenPrice(
    costPrice: number,
    marketplace: Marketplace,
    category: InventoryKind,
    targetMarginPercent: number = 20
  ): number {
    // Use binary search to find the price that gives us the target margin
    let low = costPrice * 1.01; // Start slightly above cost
    let high = costPrice * 10; // Start with 10x cost as upper bound
    let iterations = 0;
    const maxIterations = 50;

    while (high - low > 0.01 && iterations < maxIterations) {
      const mid = (low + high) / 2;
      
      try {
        const result = this.calculateNetMargin(costPrice, mid, {
          marketplace,
          category,
          salePrice: mid,
        });

        if (result.marginPercent < targetMarginPercent) {
          low = mid;
        } else {
          high = mid;
        }
      } catch (error) {
        // Category not supported on this marketplace
        return -1;
      }

      iterations++;
    }

    return Math.round(high * 100) / 100;
  }

  private calculatePaymentProcessingFee(
    amount: number,
    paymentMethod: 'paypal' | 'credit_card' | 'managed_payments',
    structure: MarketplaceFeeStructure
  ): number {
    // Different payment methods have different fee structures
    const feeRates = {
      paypal: { percent: 2.9, fixed: 0.30 },
      credit_card: { percent: 2.9, fixed: 0.30 },
      managed_payments: structure.paymentProcessing,
    };

    const rates = feeRates[paymentMethod];
    return amount * rates.percent / 100 + rates.fixed;
  }

  // Utility method to estimate fees for quick calculations
  estimateQuickFees(marketplace: Marketplace, salePrice: number): number {
    const structure = MARKETPLACE_FEE_STRUCTURES[marketplace];
    const estimatedFeePercent = structure.finalValueFee.percent + 
      structure.paymentProcessing.percent;
    
    return salePrice * estimatedFeePercent / 100 + 
           structure.paymentProcessing.fixed + 
           structure.listingFee.fixed;
  }

  // Get the most profitable marketplace for a given scenario
  getBestMarketplace(
    costPrice: number,
    targetSalePrice: number,
    category: InventoryKind
  ): {
    marketplace: Marketplace;
    netProfit: number;
    marginPercent: number;
  } | null {
    let bestMarketplace: Marketplace | null = null;
    let bestNetProfit = -Infinity;
    let bestMarginPercent = 0;

    for (const marketplace of Object.keys(MARKETPLACE_FEE_STRUCTURES) as Marketplace[]) {
      try {
        const result = this.calculateNetMargin(costPrice, targetSalePrice, {
          marketplace,
          category,
          salePrice: targetSalePrice,
        });

        if (result.netProfit > bestNetProfit) {
          bestNetProfit = result.netProfit;
          bestMarginPercent = result.marginPercent;
          bestMarketplace = marketplace;
        }
      } catch (error) {
        // Category not supported on this marketplace, skip
        continue;
      }
    }

    return bestMarketplace ? {
      marketplace: bestMarketplace,
      netProfit: bestNetProfit,
      marginPercent: bestMarginPercent,
    } : null;
  }
}