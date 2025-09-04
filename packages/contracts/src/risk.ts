import { z } from 'zod';
import { AlertSeverity } from './common';

export const RiskStatus = z.object({
  disputePct7d: z.number(),
  refundPct30d: z.number(),
  warnings: z.array(z.string()),
  governor: z.object({
    state: z.enum(['open', 'throttled', 'paused']),
    reason: z.string().optional(),
  }),
});
export type RiskStatus = z.infer<typeof RiskStatus>;

export const Alert = z.object({
  id: z.string(),
  severity: AlertSeverity,
  message: z.string(),
  module: z.string(),
  createdTs: z.string().datetime(),
  resolvedTs: z.string().datetime().optional(),
});
export type Alert = z.infer<typeof Alert>;

export const GovernorUpdateRequest = z.object({
  action: z.enum(['throttle', 'pause', 'resume']),
  reason: z.string().optional(),
  params: z.record(z.any()).optional(),
});
export type GovernorUpdateRequest = z.infer<typeof GovernorUpdateRequest>;