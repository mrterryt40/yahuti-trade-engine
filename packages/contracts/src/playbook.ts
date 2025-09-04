import { z } from 'zod';

export const PlaybookStatus = z.enum(['DRAFT', 'VALIDATED', 'STAGED', 'ACTIVE', 'ARCHIVED']);

export const Playbook = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  content: z.string(), // YAML content
  checksum: z.string(),
  status: PlaybookStatus.default('DRAFT'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  activatedAt: z.string().datetime().optional(),
});
export type Playbook = z.infer<typeof Playbook>;

export const CreatePlaybookRequest = z.object({
  name: z.string(),
  content: z.string(),
});
export type CreatePlaybookRequest = z.infer<typeof CreatePlaybookRequest>;

export const UpdatePlaybookRequest = z.object({
  content: z.string(),
});
export type UpdatePlaybookRequest = z.infer<typeof UpdatePlaybookRequest>;

export const ActivatePlaybookRequest = z.object({
  playbookId: z.string(),
});
export type ActivatePlaybookRequest = z.infer<typeof ActivatePlaybookRequest>;