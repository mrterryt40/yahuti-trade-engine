import { z } from 'zod';

export const KpiSummary = z.object({
  pnlToday: z.number(),
  pnlMtd: z.number(),
  bankroll: z.number(),
  cashToTrust: z.number(),
  flipsToday: z.number(),
  avgProfitPerFlip: z.number(),
  sellThroughHours: z.number(),
  disputePct7d: z.number(),
  refundPct30d: z.number(),
});
export type KpiSummary = z.infer<typeof KpiSummary>;

export const SystemStatus = z.object({
  hunter: z.enum(['green', 'amber', 'red']),
  buyer: z.enum(['green', 'amber', 'red']),
  merchant: z.enum(['green', 'amber', 'red']),
  fulfillment: z.enum(['green', 'amber', 'red']),
  collector: z.enum(['green', 'amber', 'red']),
  reprice: z.enum(['green', 'amber', 'red']),
  allocator: z.enum(['green', 'amber', 'red']),
  brains: z.enum(['green', 'amber', 'red']),
  governor: z.enum(['green', 'amber', 'red']),
});
export type SystemStatus = z.infer<typeof SystemStatus>;

export const GlobalControl = z.object({
  action: z.enum(['START', 'PAUSE', 'KILL']),
});
export type GlobalControl = z.infer<typeof GlobalControl>;