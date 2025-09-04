import { Marketplace, InventoryKind } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('MarketplaceClient');

export interface ListingData {
  sku: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  images?: string[];
  attributes?: Record<string, string>;
}

export interface ListingResult {
  success: boolean;
  listingId?: string;
  marketplaceId?: string;
  fees?: number;
  error?: string;
}

export interface PriceUpdate {
  listingId: string;
  newPrice: number;
}

export interface PriceUpdateResult {
  success: boolean;
  oldPrice?: number;
  newPrice?: number;
  error?: string;
}

export interface MarketplaceConfig {
  name: string;
  apiEndpoint: string;
  authRequired: boolean;
  maxTitleLength: number;
  maxDescriptionLength: number;
  supportedCategories: InventoryKind[];
  listingFeePercent: number;
  finalValueFeePercent: number;
  fixedFee: number;
  rateLimit: number; // requests per minute
}

const MARKETPLACE_CONFIGS: Record<Marketplace, MarketplaceConfig> = {
  EBAY: {
    name: 'eBay',
    apiEndpoint: 'https://api.ebay.com/ws/api.dll',
    authRequired: true,
    maxTitleLength: 80,
    maxDescriptionLength: 500000,
    supportedCategories: ['KEY', 'ACCOUNT', 'GIFTCARD'],
    listingFeePercent: 0,
    finalValueFeePercent: 12.9,
    fixedFee: 0.35,
    rateLimit: 1000,
  },
  AMAZON: {
    name: 'Amazon',
    apiEndpoint: 'https://mws.amazonservices.com',
    authRequired: true,
    maxTitleLength: 200,
    maxDescriptionLength: 2000,
    supportedCategories: ['KEY', 'GIFTCARD'],
    listingFeePercent: 0,
    finalValueFeePercent: 15,
    fixedFee: 0,
    rateLimit: 200,
  },
  GODADDY: {
    name: 'GoDaddy Auctions',
    apiEndpoint: 'https://api.godaddy.com',
    authRequired: true,
    maxTitleLength: 100,
    maxDescriptionLength: 1000,
    supportedCategories: ['DOMAIN'],
    listingFeePercent: 0,
    finalValueFeePercent: 20,
    fixedFee: 0,
    rateLimit: 60,
  },
  NAMECHEAP: {
    name: 'Namecheap',
    apiEndpoint: 'https://api.namecheap.com',
    authRequired: true,
    maxTitleLength: 150,
    maxDescriptionLength: 2000,
    supportedCategories: ['DOMAIN'],
    listingFeePercent: 0,
    finalValueFeePercent: 18,
    fixedFee: 0,
    rateLimit: 100,
  },
  G2G: {
    name: 'G2G',
    apiEndpoint: 'https://api.g2g.com',
    authRequired: true,
    maxTitleLength: 120,
    maxDescriptionLength: 5000,
    supportedCategories: ['KEY', 'ACCOUNT'],
    listingFeePercent: 0,
    finalValueFeePercent: 10.9,
    fixedFee: 0,
    rateLimit: 120,
  },
  PLAYERAUCTIONS: {
    name: 'PlayerAuctions',
    apiEndpoint: 'https://api.playerauctions.com',
    authRequired: true,
    maxTitleLength: 100,
    maxDescriptionLength: 3000,
    supportedCategories: ['ACCOUNT', 'KEY'],
    listingFeePercent: 0,
    finalValueFeePercent: 11.9,
    fixedFee: 0,
    rateLimit: 100,
  },
};

export class MarketplaceClient {
  private marketplace: Marketplace;
  private config: MarketplaceConfig;
  private lastRequestTime: number = 0;

  constructor(marketplace: Marketplace) {
    this.marketplace = marketplace;
    this.config = MARKETPLACE_CONFIGS[marketplace];
    
    logger.info(`Initialized client for ${this.config.name}`, {
      marketplace,
      rateLimit: this.config.rateLimit,
      supportedCategories: this.config.supportedCategories,
    });
  }

  async createListing(listingData: ListingData): Promise<ListingResult> {
    logger.info(`Creating listing on ${this.config.name}`, {
      marketplace: this.marketplace,
      sku: listingData.sku,
      price: listingData.price,
    });

    try {
      // Validate listing data
      const validation = this.validateListingData(listingData);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
        };
      }

      // Respect rate limits
      await this.enforceRateLimit();

      // Mock API call - in reality would call actual marketplace API
      const result = await this.mockCreateListing(listingData);
      
      logger.info(`Listing created successfully`, {
        marketplace: this.marketplace,
        sku: listingData.sku,
        listingId: result.listingId,
        marketplaceId: result.marketplaceId,
        fees: result.fees,
      });

      return result;

    } catch (error) {
      logger.error(`Failed to create listing on ${this.config.name}:`, error, {
        marketplace: this.marketplace,
        sku: listingData.sku,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updatePrice(listingId: string, newPrice: number): Promise<PriceUpdateResult> {
    logger.info(`Updating price on ${this.config.name}`, {
      marketplace: this.marketplace,
      listingId,
      newPrice,
    });

    try {
      // Respect rate limits
      await this.enforceRateLimit();

      // Mock API call - in reality would call actual marketplace API
      const result = await this.mockUpdatePrice(listingId, newPrice);

      logger.info(`Price updated successfully`, {
        marketplace: this.marketplace,
        listingId,
        oldPrice: result.oldPrice,
        newPrice: result.newPrice,
      });

      return result;

    } catch (error) {
      logger.error(`Failed to update price on ${this.config.name}:`, error, {
        marketplace: this.marketplace,
        listingId,
        newPrice,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async deleteListing(listingId: string): Promise<{ success: boolean; error?: string }> {
    logger.info(`Deleting listing on ${this.config.name}`, {
      marketplace: this.marketplace,
      listingId,
    });

    try {
      // Respect rate limits
      await this.enforceRateLimit();

      // Mock API call - in reality would call actual marketplace API
      await this.mockDeleteListing(listingId);

      logger.info(`Listing deleted successfully`, {
        marketplace: this.marketplace,
        listingId,
      });

      return { success: true };

    } catch (error) {
      logger.error(`Failed to delete listing on ${this.config.name}:`, error, {
        marketplace: this.marketplace,
        listingId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  async getListingStatus(listingId: string): Promise<{
    success: boolean;
    status?: string;
    views?: number;
    watchers?: number;
    error?: string;
  }> {
    logger.debug(`Getting listing status on ${this.config.name}`, {
      marketplace: this.marketplace,
      listingId,
    });

    try {
      // Respect rate limits
      await this.enforceRateLimit();

      // Mock API call
      const result = await this.mockGetListingStatus(listingId);

      return {
        success: true,
        ...result,
      };

    } catch (error) {
      logger.error(`Failed to get listing status on ${this.config.name}:`, error, {
        marketplace: this.marketplace,
        listingId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  }

  private validateListingData(listingData: ListingData): { valid: boolean; error?: string } {
    // Check if category is supported
    const category = this.inferCategoryFromSku(listingData.sku);
    if (!this.config.supportedCategories.includes(category)) {
      return {
        valid: false,
        error: `Category ${category} not supported on ${this.config.name}`,
      };
    }

    // Check title length
    if (listingData.title.length > this.config.maxTitleLength) {
      return {
        valid: false,
        error: `Title too long (${listingData.title.length}/${this.config.maxTitleLength})`,
      };
    }

    // Check description length
    if (listingData.description.length > this.config.maxDescriptionLength) {
      return {
        valid: false,
        error: `Description too long (${listingData.description.length}/${this.config.maxDescriptionLength})`,
      };
    }

    // Check price is positive
    if (listingData.price <= 0) {
      return {
        valid: false,
        error: 'Price must be positive',
      };
    }

    return { valid: true };
  }

  private inferCategoryFromSku(sku: string): InventoryKind {
    if (sku.startsWith('KEY-')) return 'KEY';
    if (sku.startsWith('ACC-')) return 'ACCOUNT';
    if (sku.startsWith('DOM-')) return 'DOMAIN';
    if (sku.startsWith('GC-')) return 'GIFTCARD';
    if (sku.startsWith('SUB-')) return 'SUBSCRIPTION';
    return 'KEY'; // default
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const minInterval = 60000 / this.config.rateLimit; // ms between requests
    const elapsed = now - this.lastRequestTime;
    
    if (elapsed < minInterval) {
      const delay = minInterval - elapsed;
      logger.debug(`Rate limiting: waiting ${delay}ms`, {
        marketplace: this.marketplace,
        rateLimit: this.config.rateLimit,
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    this.lastRequestTime = Date.now();
  }

  // Mock implementations - would be replaced with actual API calls

  private async mockCreateListing(listingData: ListingData): Promise<ListingResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 800));

    // Simulate occasional failures
    if (Math.random() < 0.05) {
      throw new Error('API temporarily unavailable');
    }

    const listingId = `list_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const marketplaceId = `${this.marketplace.toLowerCase()}_${Math.random().toString(36).substr(2, 6)}`;
    
    // Calculate estimated fees
    const price = listingData.price;
    const fees = price * (this.config.finalValueFeePercent / 100) + this.config.fixedFee;

    return {
      success: true,
      listingId,
      marketplaceId,
      fees: Math.round(fees * 100) / 100,
    };
  }

  private async mockUpdatePrice(listingId: string, newPrice: number): Promise<PriceUpdateResult> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 400));

    // Simulate occasional failures
    if (Math.random() < 0.03) {
      throw new Error('Price update failed - listing not found');
    }

    const oldPrice = Math.round((newPrice * (0.8 + Math.random() * 0.4)) * 100) / 100;

    return {
      success: true,
      oldPrice,
      newPrice,
    };
  }

  private async mockDeleteListing(listingId: string): Promise<void> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));

    // Simulate occasional failures
    if (Math.random() < 0.02) {
      throw new Error('Delete failed - listing has active bids');
    }
  }

  private async mockGetListingStatus(listingId: string): Promise<{
    status: string;
    views: number;
    watchers: number;
  }> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));

    const statuses = ['ACTIVE', 'ENDED', 'SOLD', 'PAUSED'];
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    return {
      status,
      views: Math.floor(Math.random() * 1000),
      watchers: Math.floor(Math.random() * 50),
    };
  }

  // Utility methods

  getConfig(): MarketplaceConfig {
    return this.config;
  }

  getSupportedCategories(): InventoryKind[] {
    return this.config.supportedCategories;
  }

  calculateFees(price: number): number {
    return price * (this.config.finalValueFeePercent / 100) + this.config.fixedFee;
  }

  async testConnection(): Promise<boolean> {
    try {
      logger.info(`Testing connection to ${this.config.name}`, {
        marketplace: this.marketplace,
      });

      await this.enforceRateLimit();
      
      // Mock connection test
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Simulate occasional connection failures
      if (Math.random() < 0.03) {
        throw new Error('Connection timeout');
      }

      logger.info(`Connection test successful for ${this.config.name}`);
      return true;

    } catch (error) {
      logger.error(`Connection test failed for ${this.config.name}:`, error);
      return false;
    }
  }
}