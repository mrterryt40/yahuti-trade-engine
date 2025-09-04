import { z } from 'zod';
import { InventoryKind, DeliveryPolicy, InventoryStatus } from './common';

export const InventoryItem = z.object({
  id: z.string(),
  sku: z.string(),
  kind: InventoryKind,
  cost: z.number().min(0),
  provenance: z.string().optional(),
  encryptedBlobRef: z.string().optional(),
  proofHash: z.string().optional(),
  expiry: z.string().datetime().optional(),
  policy: DeliveryPolicy.default('INSTANT'),
  status: InventoryStatus.default('AVAILABLE'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type InventoryItem = z.infer<typeof InventoryItem>;

export const ReissueRequest = z.object({
  inventoryId: z.string(),
  reason: z.string().optional(),
});
export type ReissueRequest = z.infer<typeof ReissueRequest>;

export const RefundRequest = z.object({
  inventoryId: z.string(),
  amount: z.number().min(0).optional(),
  reason: z.string(),
});
export type RefundRequest = z.infer<typeof RefundRequest>;

export const InvalidateRequest = z.object({
  inventoryId: z.string(),
  reason: z.string(),
});
export type InvalidateRequest = z.infer<typeof InvalidateRequest>;