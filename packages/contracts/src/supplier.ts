import { z } from 'zod';

export const Supplier = z.object({
  id: z.string(),
  name: z.string(),
  rating: z.number().min(0).max(5).default(0),
  country: z.string().optional(),
  blacklisted: z.boolean().default(false),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Supplier = z.infer<typeof Supplier>;

export const BlacklistSupplierRequest = z.object({
  supplierId: z.string(),
  reason: z.string(),
});
export type BlacklistSupplierRequest = z.infer<typeof BlacklistSupplierRequest>;