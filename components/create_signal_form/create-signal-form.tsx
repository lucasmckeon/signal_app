'use client';

import { useEffect, useMemo, useState } from 'react';
import { useActionState } from 'react';
import { createSignal } from '@/app/actions';
import type { SignalsFormState } from '@/types/signal';
import styles from './create-signal.module.scss';
import { useRouter } from 'next/navigation';

const initialState: SignalsFormState = {
  success: false,
  message: null,
  errors: {},
};

export default function CreateSignalForm() {
  const [creatorId, setCreatorId] = useState<string | null>(null);

  const [mood, setMood] = useState('green');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const router = useRouter();
  const [state, formAction, isPending] = useActionState<
    SignalsFormState,
    FormData
  >(createSignal, initialState);

  const hasErrors = useMemo(
    () =>
      !!state.errors &&
      Object.values(state.errors).some((arr) => (arr?.length ?? 0) > 0),
    [state.errors]
  );
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    let stored = localStorage.getItem('creatorId');
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem('creatorId', stored);
    }
    setCreatorId(stored);
  }, []);

  useEffect(() => {
    if (isPending) setShowFeedback(false);
    else if (!isPending && (state.success || state.message || hasErrors))
      setShowFeedback(true);
  }, [isPending, state.success, state.message, hasErrors]);

  useEffect(() => {
    if (!isPending && state.success) {
      setMood('green');
      setNote('');
      setTags('');
      setFollowUpRequired(false);
      //Implicit assumption that the view showing signals is a sibling under
      //a shared parent server component
      router.refresh();
    }
  }, [isPending, state.success, router]);

  const onEdit = () => setShowFeedback(false);

  if (!creatorId) return null;

  return (
    <div className={styles.root}>
      {/* (Optional) Link spot to mirror MyAccount’s header link */}
      <form action={formAction} aria-busy={isPending}>
        <input type="hidden" name="creatorId" value={creatorId} />

        <label>
          Mood:
          <select
            name="mood"
            value={mood}
            onChange={(e) => {
              setMood(e.target.value);
              onEdit();
            }}
            disabled={isPending}
          >
            <option value="green">Green</option>
            <option value="yellow">Yellow</option>
            <option value="red">Red</option>
          </select>
        </label>
        {showFeedback &&
          state.errors?.mood &&
          state.errors.mood.map((msg, i) => (
            <p key={`mood-error-${i}`} className={styles.error}>
              {msg}
            </p>
          ))}

        <label>
          Note:
          <textarea
            name="note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              onEdit();
            }}
            rows={3}
            placeholder="Write 1–2 sentences"
            disabled={isPending}
          />
        </label>
        {showFeedback &&
          state.errors?.note &&
          state.errors.note.map((msg, i) => (
            <p key={`note-error-${i}`} className={styles.error}>
              {msg}
            </p>
          ))}

        <label>
          Tags (comma-separated):
          <input
            type="text"
            name="tags"
            value={tags}
            onChange={(e) => {
              setTags(e.target.value);
              onEdit();
            }}
            placeholder="e.g. planning, release"
            disabled={isPending}
          />
        </label>
        {showFeedback &&
          state.errors?.tags &&
          state.errors.tags.map((msg, i) => (
            <p key={`tags-error-${i}`} className={styles.error}>
              {msg}
            </p>
          ))}

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            name="followUpRequired"
            checked={followUpRequired}
            onChange={(e) => {
              setFollowUpRequired(e.target.checked);
              onEdit();
            }}
            disabled={isPending}
          />
          Follow-up required
        </label>
        {showFeedback &&
          state.errors?.followUpRequired &&
          state.errors.followUpRequired.map((msg, i) => (
            <p key={`fur-error-${i}`} className={styles.error}>
              {msg}
            </p>
          ))}

        <button
          className="secondary"
          type="submit"
          disabled={isPending}
          aria-disabled={isPending}
        >
          {isPending ? 'Submitting…' : 'Submit'}
        </button>

        {showFeedback && state.message && !state.success && (
          <p>{state.message}</p>
        )}
        {showFeedback && state.success && <p>Signal created successfully!</p>}
      </form>
    </div>
  );
}
