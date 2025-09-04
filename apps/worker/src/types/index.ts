import type { InventoryKind, Marketplace, DeliveryPolicy } from '@yahuti/contracts';

// Common job interfaces
export interface BaseJobData {
  id?: string;
  dryRun?: boolean;
  priority?: number;
  userId?: string;
}

// Deal candidate interface for hunter/evaluator
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
  expectedSellThroughDays?: number;
  quantity: number;
  notes?: string;
  url?: string;
  metadata?: Record<string, any>;
}

// Scanner configuration
export interface ScanConfig {
  categories: InventoryKind[];
  maxItems: number;
  minMargin: number;
  minConfidence: number;
  priceRange?: { min: number; max: number };
  excludeSellers?: string[];
}

// Marketplace listing interface
export interface MarketplaceListing {
  marketplace: Marketplace;
  sku: string;
  title: string;
  description: string;
  price: number;
  quantity: number;
  category: string;
  images?: string[];
  metadata?: Record<string, any>;
}

// Purchase order interface
export interface PurchaseOrder {
  candidateId: string;
  source: string;
  sku: string;
  quantity: number;
  maxPrice: number;
  notes?: string;
}

// Fulfillment order interface
export interface FulfillmentOrder {
  transactionId: string;
  inventoryId: string;
  buyerEmail: string;
  marketplace: Marketplace;
  deliveryMethod: DeliveryPolicy;
  urgency: 'normal' | 'priority' | 'urgent';
}

// Reprice job data
export interface RepriceJobData extends BaseJobData {
  listingIds?: string[];
  marketplace?: Marketplace;
  strategy: 'aggressive' | 'balanced' | 'conservative';
  constraints?: {
    minMargin?: number;
    maxDiscount?: number;
    competitorCount?: number;
  };
}

// Allocation job data
export interface AllocationJobData extends BaseJobData {
  rebalanceThreshold: number;
  targetAllocation?: Record<string, number>;
  maxShift?: number;
}

// Experiment data
export interface ExperimentJobData extends BaseJobData {
  experimentId: string;
  type: 'price' | 'title' | 'description' | 'image';
  variants: Array<{
    id: string;
    config: Record<string, any>;
  }>;
  sampleSize?: number;
  duration?: number; // hours
}

// Risk assessment result
export interface RiskAssessment {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: Array<{
    type: string;
    impact: number;
    description: string;
  }>;
  recommendations: string[];
}

// Fee breakdown
export interface FeeBreakdown {
  marketplace: Marketplace;
  listingFee: number;
  finalValueFee: number;
  paymentFee: number;
  shippingFee: number;
  otherFees: number;
  totalFees: number;
  netAmount: number;
}

// Job result interfaces
export interface JobResult {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  metrics?: Record<string, number>;
}

export interface HunterResult extends JobResult {
  source: string;
  candidatesFound: number;
  candidatesSaved: number;
}

export interface EvaluatorResult extends JobResult {
  candidatesProcessed: number;
  candidatesApproved: number;
  candidatesRejected: number;
}

export interface BuyerResult extends JobResult {
  ordersPlaced: number;
  totalSpent: number;
  failures: number;
}

export interface MerchantResult extends JobResult {
  listingsCreated: number;
  listingsUpdated: number;
  failures: number;
}

export interface FulfillmentResult extends JobResult {
  ordersProcessed: number;
  deliveriesSuccessful: number;
  deliveriesFailed: number;
}

// API response interfaces
export interface SourceAPIResponse {
  success: boolean;
  data: DealCandidate[];
  pagination?: {
    page: number;
    hasMore: boolean;
    total?: number;
  };
  rateLimit?: {
    remaining: number;
    resetTime: number;
  };
}

export interface MarketplaceAPIResponse {
  success: boolean;
  listingId?: string;
  status: string;
  fees?: FeeBreakdown;
  errors?: string[];
}