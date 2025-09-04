import { z } from 'zod';
import { InventoryKind } from './common';

export const DealCandidate = z.object({
  id: z.string(),
  source: z.string(),
  sku: z.string(),
  kind: InventoryKind.default('KEY'),
  cost: z.number().min(0),
  estimatedResale: z.number().min(0),
  estimatedFees: z.number().min(0),
  netMargin: z.number().min(0).max(1), // 0-1 representing 0-100%
  confidence: z.number().min(0).max(1),
  sellerScore: z.number().min(0).max(5),
  expectedSellThroughDays: z.number().min(0).optional(),
  quantity: z.number().min(1).default(1),
  notes: z.string().optional(),
  discoveredAt: z.string().datetime(),
});
export type DealCandidate = z.infer<typeof DealCandidate>;

export const DealCandidateFilters = z.object({
  minNetMargin: z.number().min(0).max(1).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  minSellerScore: z.number().min(0).max(5).optional(),
  maxQuantityPerDay: z.number().min(1).optional(),
  categories: z.array(InventoryKind).optional(),
  sources: z.array(z.string()).optional(),
  country: z.string().optional(),
});
export type DealCandidateFilters = z.infer<typeof DealCandidateFilters>;

export const ApproveRuleRequest = z.object({
  candidateIds: z.array(z.string()).optional(),
  rule: z.object({
    minNetMargin: z.number().min(0).max(1),
    minConfidence: z.number().min(0).max(1),
    minSellerScore: z.number().min(0).max(5),
    categories: z.array(InventoryKind).optional(),
  }),
});
export type ApproveRuleRequest = z.infer<typeof ApproveRuleRequest>;