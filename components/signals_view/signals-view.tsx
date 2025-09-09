/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useRef, useState } from 'react';
import { useActionState } from 'react';
import styles from './signals-view.module.scss';
import type { Signal } from '@/types/signal';
// ⬇️ Adjust this import path to wherever you defined the server action
import { markAsFollowedUp } from '@/app/actions';
import { FollowUpActionResult, FollowUp } from '@/types/follow_up';
import { USER_ID } from '@/constants';

export default function SignalsView({ signals }: { signals: Signal[] }) {
  const [bySignal, setBySignal] = useState<Map<string, FollowUp>>(new Map());
  const [error, setError] = useState<string | null>(null);

  const fetchFollowUps = async () => {
    try {
      setError(null);
      //TODO inital generated fetch failed here because it did follow-ups instead of follow_ups
      //Must take this into account when creating gpt helper
      const res = await fetch('/api/follow_ups', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list: FollowUp[] = await res.json();
      const map = new Map<string, FollowUp>();
      for (const f of list) if (!map.has(f.signalId)) map.set(f.signalId, f);
      setBySignal(map);
    } catch (e: any) {
      setError(e.message || 'Failed to load follow-ups');
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  return (
    <div className={styles.root}>
      {signals.map((signal) => (
        <SignalCard
          key={signal.id}
          signal={signal}
          followUp={bySignal.get(signal.id)}
          onMarked={fetchFollowUps}
        />
      ))}
      {error && (
        <p className={styles.error}>Failed to load follow-ups: {error}</p>
      )}
    </div>
  );
}

function SignalCard({
  signal,
  followUp,
  onMarked,
}: {
  signal: Signal;
  followUp?: FollowUp;
  onMarked: () => void;
}) {
  const bg =
    signal.mood === 'green'
      ? '#e6ffe6'
      : signal.mood === 'yellow'
      ? '#fffbe6'
      : '#ffe6e6';

  return (
    <div
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: bg,
      }}
    >
      <h3>Mood: {signal.mood.toUpperCase()}</h3>
      <p>
        <strong>Note:</strong> {signal.note}
      </p>
      <p>
        <strong>Tags:</strong> {signal.tags?.join(', ') || '—'}
      </p>
      <p>
        <strong>Follow Up Required?</strong> :{' '}
        {signal.followUpRequired ? 'Yes' : 'No'}
      </p>
      {signal.followUpRequired &&
        (followUp ? (
          <p>
            <strong>Followed Up:</strong>{' '}
            {new Date(followUp.followedUpAt).toLocaleString()}
          </p>
        ) : (
          <MarkFollowedUp signalId={signal.id} onSuccess={onMarked} />
        ))}

      <p>
        <strong>Created At:</strong>{' '}
        {new Date(signal.createdAt).toLocaleString()}
      </p>
      <p>
        <strong>Creator ID:</strong> {signal.creatorId}
      </p>
    </div>
  );
}

function MarkFollowedUp({
  signalId,
  onSuccess,
}: {
  signalId: string;
  onSuccess: () => void;
}) {
  // Pull the acting user id from localStorage (matches your project’s pattern)
  // Need | null as first render will have null userId until we get from local storage
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let stored = localStorage.getItem(USER_ID);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(USER_ID, stored);
    }
    setUserId(stored);
  }, []);

  const [state, formAction] = useActionState<FollowUpActionResult, FormData>(
    markAsFollowedUp,
    {} as FollowUpActionResult
  );

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  if (!userId) return null;

  return (
    <form ref={formRef} action={formAction}>
      <input type="hidden" name="signalId" value={signalId} />
      <input type="hidden" name="userId" value={userId} />
      <label
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}
      >
        <input
          type="checkbox"
          name="confirm"
          onChange={(e) => {
            if (e.currentTarget.checked) formRef.current?.requestSubmit();
          }}
        />
        Mark as followed up
      </label>
      {state?.error && <p className={styles.error}>Error: {state.error}</p>}
    </form>
  );
}
