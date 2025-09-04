import { InventoryKind } from '@yahuti/db';
import { createLogger } from '../utils/logger';

const logger = createLogger('SourceScanner');

export interface ScanOptions {
  categories: string[];
  maxItems: number;
  minMargin: number;
  minConfidence: number;
}

export interface DealCandidate {
  source: string;
  sku: string;
  kind: InventoryKind;
  cost: number;
  estimatedResale: number;
  estimatedFees: number;
  netMargin: number;
  confidence: number;
  sellerScore: number;
  expectedSellThroughDays: number;
  quantity: number;
  notes?: string;
}

export interface SourceConfig {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
  supportedCategories: InventoryKind[];
}

const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  G2A: {
    name: 'G2A',
    baseUrl: 'https://api.g2a.com',
    rateLimit: 120,
    supportedCategories: ['KEY', 'ACCOUNT', 'GIFTCARD'],
  },
  KINGUIN: {
    name: 'Kinguin',
    baseUrl: 'https://api.kinguin.net',
    rateLimit: 60,
    supportedCategories: ['KEY', 'ACCOUNT'],
  },
  CDKEYS: {
    name: 'CDKeys',
    baseUrl: 'https://api.cdkeys.com',
    rateLimit: 30,
    supportedCategories: ['KEY'],
  },
  GAMEFLIP: {
    name: 'GameFlip',
    baseUrl: 'https://api.gameflip.com',
    rateLimit: 100,
    supportedCategories: ['KEY', 'ACCOUNT', 'GIFTCARD'],
  },
  GIFTCARD_GRANNY: {
    name: 'Gift Card Granny',
    baseUrl: 'https://api.giftcardgranny.com',
    rateLimit: 50,
    supportedCategories: ['GIFTCARD'],
  },
};

export class SourceScanner {
  private source: string;
  private config: SourceConfig;

  constructor(source: string) {
    this.source = source.toUpperCase();
    this.config = SOURCE_CONFIGS[this.source];
    
    if (!this.config) {
      throw new Error(`Unsupported source: ${source}`);
    }

    logger.info(`Initialized scanner for ${this.config.name}`, {
      source: this.source,
      rateLimit: this.config.rateLimit,
      supportedCategories: this.config.supportedCategories,
    });
  }

  async scanDeals(options: ScanOptions): Promise<DealCandidate[]> {
    logger.info(`Starting deal scan`, { source: this.source, options });

    // Filter categories to only supported ones
    const supportedCategories = options.categories.filter(cat => 
      this.config.supportedCategories.includes(cat as InventoryKind)
    );

    if (supportedCategories.length === 0) {
      logger.warn(`No supported categories for source ${this.source}`, {
        requested: options.categories,
        supported: this.config.supportedCategories,
      });
      return [];
    }

    const candidates: DealCandidate[] = [];

    try {
      // Simulate API calls for each category
      for (const category of supportedCategories) {
        logger.debug(`Scanning category ${category}`, { source: this.source });
        
        const categoryDeals = await this.scanCategory(
          category as InventoryKind,
          options
        );
        
        candidates.push(...categoryDeals);
        
        // Respect rate limits
        await this.delay(60000 / this.config.rateLimit);
      }

      // Filter by minimum margin and confidence
      const filteredCandidates = candidates.filter(candidate => 
        candidate.netMargin >= options.minMargin && 
        candidate.confidence >= options.minConfidence
      );

      // Sort by net margin descending and limit results
      const sortedCandidates = filteredCandidates
        .sort((a, b) => b.netMargin - a.netMargin)
        .slice(0, options.maxItems);

      logger.info(`Scan completed`, {
        source: this.source,
        totalFound: candidates.length,
        afterFiltering: filteredCandidates.length,
        returned: sortedCandidates.length,
      });

      return sortedCandidates;

    } catch (error) {
      logger.error(`Failed to scan deals from ${this.source}:`, error);
      throw error;
    }
  }

  private async scanCategory(
    category: InventoryKind,
    options: ScanOptions
  ): Promise<DealCandidate[]> {
    // Mock implementation - in reality this would make actual API calls
    logger.debug(`Scanning ${category} category`, { source: this.source });

    // Simulate API response delay
    await this.delay(100 + Math.random() * 500);

    // Generate mock deals based on the source and category
    const mockDeals = this.generateMockDeals(category, options.maxItems);
    
    logger.debug(`Found ${mockDeals.length} deals in ${category}`, {
      source: this.source,
      category,
    });

    return mockDeals;
  }

  private generateMockDeals(category: InventoryKind, maxItems: number): DealCandidate[] {
    const deals: DealCandidate[] = [];
    const itemCount = Math.floor(Math.random() * Math.min(maxItems, 20)) + 1;

    for (let i = 0; i < itemCount; i++) {
      const cost = Math.random() * 50 + 5; // $5-$55
      const markup = 1.2 + Math.random() * 0.8; // 20%-100% markup
      const resale = cost * markup;
      const fees = resale * (0.08 + Math.random() * 0.07); // 8-15% fees
      const net = resale - cost - fees;
      const margin = net / cost;

      // Vary confidence based on source reliability and deal quality
      const baseConfidence = this.getSourceReliability();
      const marginBonus = Math.min(margin * 0.1, 0.2); // Higher margins = higher confidence
      const confidence = Math.min(baseConfidence + marginBonus + (Math.random() * 0.1), 1.0);

      deals.push({
        source: this.source,
        sku: this.generateSKU(category, i),
        kind: category,
        cost: Math.round(cost * 100) / 100,
        estimatedResale: Math.round(resale * 100) / 100,
        estimatedFees: Math.round(fees * 100) / 100,
        netMargin: Math.round(margin * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
        sellerScore: 0.6 + Math.random() * 0.4, // 60-100% seller score
        expectedSellThroughDays: Math.random() * 14 + 1, // 1-15 days
        quantity: Math.floor(Math.random() * 5) + 1, // 1-5 quantity
        notes: this.generateNotes(category),
      });
    }

    return deals;
  }

  private generateSKU(category: InventoryKind, index: number): string {
    const prefixes = {
      KEY: 'KEY',
      ACCOUNT: 'ACC',
      SUBSCRIPTION: 'SUB',
      DOMAIN: 'DOM',
      GIFTCARD: 'GC',
    };

    const games = ['FIFA24', 'COD', 'STEAM', 'XBOX', 'PSN', 'APEX', 'FORTNITE'];
    const domains = ['PREMIUM', 'EXPIRED', 'BACKORDER'];
    const giftcards = ['AMAZON', 'STEAM', 'GOOGLE', 'APPLE', 'WALMART'];

    let suffix = '';
    switch (category) {
      case 'KEY':
      case 'ACCOUNT':
        suffix = games[Math.floor(Math.random() * games.length)];
        break;
      case 'DOMAIN':
        suffix = domains[Math.floor(Math.random() * domains.length)];
        break;
      case 'GIFTCARD':
        suffix = giftcards[Math.floor(Math.random() * giftcards.length)];
        break;
      default:
        suffix = 'MISC';
    }

    return `${prefixes[category]}-${suffix}-${String(index).padStart(3, '0')}`;
  }

  private generateNotes(category: InventoryKind): string {
    const notes = {
      KEY: [
        'Global key, works worldwide',
        'Steam activation required',
        'Region locked - EU only',
        'Pre-order key, releases next month',
      ],
      ACCOUNT: [
        'Account with 50+ hours played',
        'Fresh account, never used',
        'Premium subscription included',
        'Veteran account with rare items',
      ],
      DOMAIN: [
        'Premium domain with backlinks',
        'Expired domain, good SEO metrics',
        'Brandable domain name',
        'Exact match domain',
      ],
      GIFTCARD: [
        'Digital delivery within 1 hour',
        'Physical card available',
        'Bulk discount available',
        'No expiration date',
      ],
      SUBSCRIPTION: [
        '12 month subscription',
        'Premium tier included',
        'Multi-device license',
        'Comes with bonus features',
      ],
    };

    const categoryNotes = notes[category] || ['Standard item'];
    return categoryNotes[Math.floor(Math.random() * categoryNotes.length)];
  }

  private getSourceReliability(): number {
    const reliabilityScores = {
      G2A: 0.75,
      KINGUIN: 0.80,
      CDKEYS: 0.85,
      GAMEFLIP: 0.70,
      GIFTCARD_GRANNY: 0.88,
    };

    return reliabilityScores[this.source] || 0.60;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Method to test API connection
  async testConnection(): Promise<boolean> {
    try {
      logger.info(`Testing connection to ${this.source}`, {
        baseUrl: this.config.baseUrl,
      });

      // Mock connection test - in reality would ping the API
      await this.delay(500);
      
      // Simulate occasional connection failures
      if (Math.random() < 0.05) {
        throw new Error('Connection timeout');
      }

      logger.info(`Connection test successful for ${this.source}`);
      return true;

    } catch (error) {
      logger.error(`Connection test failed for ${this.source}:`, error);
      return false;
    }
  }

  // Get supported categories for this source
  getSupportedCategories(): InventoryKind[] {
    return this.config.supportedCategories;
  }

  // Get rate limit for this source
  getRateLimit(): number {
    return this.config.rateLimit;
  }
}