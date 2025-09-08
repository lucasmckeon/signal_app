import { z } from 'zod';

export const SignalSchema = z.object({
  id: z.uuid(),
  creatorId: z.string(), // userId reference
  mood: z.enum(['green', 'yellow', 'red']),
  note: z.string().min(1).max(300), // 1–2 sentences (soft cap at ~300 chars)
  tags: z.array(z.string()).optional(), // parsed from comma-separated text
  followUpRequired: z.boolean(),
  createdAt: z.iso.datetime(),
});
export const SignalInputSchema = z.object({
  creatorId: z.uuid(),
  mood: z.enum(['green', 'yellow', 'red']),
  note: z.string().min(1).max(300),
  tags: z.string().optional(), // comma-separated string
  followUpRequired: z.coerce.boolean(),
});

export type SignalsFormState = {
  errors?: {
    mood?: string[];
    note?: string[];
    tags?: string[];
    followUpRequired?: string[];
  };
  message?: string | null;
  success: boolean;
};

export type Signal = z.infer<typeof SignalSchema>;
