import { z } from 'zod';

// Marketplace enum
export const Marketplace = z.enum(['EBAY', 'AMAZON', 'GODADDY', 'NAMECHEAP', 'G2G', 'PLAYERAUCTIONS']);
export type Marketplace = z.infer<typeof Marketplace>;

// Inventory kinds
export const InventoryKind = z.enum(['KEY', 'ACCOUNT', 'SUBSCRIPTION', 'DOMAIN', 'GIFTCARD']);
export type InventoryKind = z.infer<typeof InventoryKind>;

// Delivery policies
export const DeliveryPolicy = z.enum(['INSTANT', 'ESCROW']);
export type DeliveryPolicy = z.infer<typeof DeliveryPolicy>;

// Status enums
export const InventoryStatus = z.enum(['AVAILABLE', 'RESERVED', 'DELIVERED', 'INVALIDATED']);
export type InventoryStatus = z.infer<typeof InventoryStatus>;

export const ListingStatus = z.enum(['ACTIVE', 'PAUSED', 'SOLD', 'ENDED', 'FLAGGED']);
export type ListingStatus = z.infer<typeof ListingStatus>;

export const TxStatus = z.enum(['PAID', 'DELIVERED', 'REFUNDED', 'DISPUTED', 'CHARGEBACK']);
export type TxStatus = z.infer<typeof TxStatus>;

export const AlertSeverity = z.enum(['INFO', 'WARN', 'CRITICAL']);
export type AlertSeverity = z.infer<typeof AlertSeverity>;

// Pagination
export const PaginationParams = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().optional(),
});
export type PaginationParams = z.infer<typeof PaginationParams>;

export const PaginatedResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    items: z.array(dataSchema),
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
    nextCursor: z.string().optional(),
  });

// API Response wrapper
export const ApiResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
    timestamp: z.string().datetime(),
  });

// Error codes
export const ErrorCode = z.enum([
  'E_RATE_LIMIT',
  'E_LOW_MARGIN',
  'E_SUPPLIER_BLACKLISTED',
  'E_DELIVERY_FAILED',
  'E_PAYMENT_HELD',
  'E_GOVERNOR_PAUSED',
  'E_INVALID_INPUT',
  'E_NOT_FOUND',
  'E_UNAUTHORIZED',
  'E_INTERNAL_ERROR',
]);
export type ErrorCode = z.infer<typeof ErrorCode>;