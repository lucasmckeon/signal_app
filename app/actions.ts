'use server';
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
