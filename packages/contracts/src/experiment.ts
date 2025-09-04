import { z } from 'zod';

export const ExperimentType = z.enum(['PRICE', 'TITLE', 'THUMBNAIL', 'COPY', 'SOURCING', 'DELIVERY']);
export const ExperimentWinner = z.enum(['A', 'B', 'TIE', 'PENDING']);
export const ExperimentStatus = z.enum(['RUNNING', 'COMPLETE', 'ARCHIVED']);

export const Experiment = z.object({
  id: z.string(),
  type: ExperimentType,
  variantA: z.record(z.any()),
  variantB: z.record(z.any()),
  winner: ExperimentWinner.default('PENDING'),
  lift: z.number().optional(),
  status: ExperimentStatus.default('RUNNING'),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
});
export type Experiment = z.infer<typeof Experiment>;