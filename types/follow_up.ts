import { z } from 'zod';

export const FollowUpSchema = z.object({
  id: z.uuid(),
  signalId: z.uuid(),
  createdAt: z.iso.datetime(),
  userId: z.string(), // who followed up
});
export type FollowUp = z.infer<typeof FollowUpSchema>;
