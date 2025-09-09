import { z } from 'zod';

export const FollowUpSchema = z.object({
  id: z.uuid(),
  signalId: z.uuid(),
  userId: z.string(), // who followed up
  followedUpAt: z.iso.datetime(),
});
export const FollowUpFormDataSchema = z.object({
  signalId: z.uuid(),
  userId: z.string(), // who followed up
});

export type FollowUpActionResult = { success: boolean; error?: string };

export type FollowUp = z.infer<typeof FollowUpSchema>;
