'use server';
import {
  FollowUpActionResult,
  FollowUpFormDataSchema,
} from '@/types/follow_up';
import { SignalsFormState, SignalInputSchema } from '@/types/signal';
import { sql } from '@vercel/postgres';

export const createSignal = async (
  prevState: SignalsFormState,
  formData: FormData
): Promise<SignalsFormState> => {
  try {
    const raw = {
      creatorId: formData.get('creatorId'),
      mood: formData.get('mood'),
      note: formData.get('note'),
      // before: tags: formData.get('tags')?.toString().trim() || null,
      tags: (() => {
        const t = formData.get('tags')?.toString().trim();
        return t ? t : undefined; // ← undefined, not null
      })(),
      followUpRequired: formData.get('followUpRequired') === 'on',
    };

    const validatedFields = SignalInputSchema.safeParse(raw);

    if (!validatedFields.success) {
      const fe = validatedFields.error.flatten().fieldErrors;
      const errors = {
        mood: fe.mood,
        note: fe.note,
        tags: fe.tags,
        followUpRequired: fe.followUpRequired,
      } as const;

      return {
        errors,
        message: 'Create signal fields incorrectly inputted. Creation failed.',
        success: false,
      };
    }

    const parsed = validatedFields.data;

    await sql`
      INSERT INTO signals (
        creator_id,
        mood,
        note,
        tags,
        follow_up_required
      ) VALUES (
        ${parsed.creatorId},
        ${parsed.mood},
        ${parsed.note},
        ${parsed.tags},
        ${parsed.followUpRequired}
      );
    `;

    return {
      success: true,
      message: null,
    };
  } catch (error) {
    console.error('Error inserting signal:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export async function markAsFollowedUp(
  _prevState: FollowUpActionResult,
  formData: FormData
): Promise<FollowUpActionResult> {
  const input = {
    signalId: formData.get('signalId'),
    userId: formData.get('userId'),
  };

  const parseResult = FollowUpFormDataSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: 'Invalid input.' };
  }

  const { signalId, userId } = parseResult.data;

  try {
    const { rows } = await sql<{ id: string; followed_up_at: Date }>`
      INSERT INTO follow_ups (signal_id, user_id)
      VALUES (${signalId}, ${userId})
      ON CONFLICT (signal_id) DO NOTHING
      RETURNING id;
    `;

    if (rows.length === 0) {
      return {
        success: false,
        error: 'Follow-up already logged by another user.',
      };
    }
    return { success: true };
  } catch (error) {
    console.error('markAsFollowedUp error:', error);
    return { success: false, error: 'Database error.' };
  }
}
