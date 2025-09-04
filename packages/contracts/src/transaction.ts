import { z } from 'zod';
import { Marketplace, TxStatus } from './common';

export const Transaction = z.object({
  id: z.string(),
  inventoryId: z.string(),
  marketplace: Marketplace,
  buyerId: z.string().optional(),
  salePrice: z.number().min(0),
  fees: z.number().min(0),
  net: z.number(),
  deliveredAt: z.string().datetime().optional(),
  status: TxStatus.default('PAID'),
  meta: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
});
export type Transaction = z.infer<typeof Transaction>;