import { z } from 'zod';
import { Marketplace, ListingStatus } from './common';

export const Listing = z.object({
  id: z.string(),
  marketplace: Marketplace,
  sku: z.string(),
  variantId: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  price: z.number().min(0),
  floor: z.number().min(0).optional(),
  ceiling: z.number().min(0).optional(),
  positionRank: z.number().min(1).optional(),
  views: z.number().min(0).default(0),
  ctr: z.number().min(0).default(0),
  sellThroughDays: z.number().min(0).optional(),
  status: ListingStatus.default('ACTIVE'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Listing = z.infer<typeof Listing>;

export const RepriceRequest = z.object({
  listingIds: z.array(z.string()),
  mode: z.enum(['aggressive', 'balanced', 'conservative']).default('balanced'),
  floorOffsetPct: z.number().default(-0.5),
  ceilingOffsetPct: z.number().default(4.0),
});
export type RepriceRequest = z.infer<typeof RepriceRequest>;

export const RepriceResponse = z.object({
  updated: z.number(),
  details: z.array(
    z.object({
      id: z.string(),
      oldPrice: z.number(),
      newPrice: z.number(),
      reason: z.string(),
    })
  ),
});
export type RepriceResponse = z.infer<typeof RepriceResponse>;