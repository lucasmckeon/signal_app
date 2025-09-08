'use client';

import { Signal } from '@/types/signal';
import styles from './signals-view.module.scss';

export default function SignalsView({ signals }: { signals: Signal[] }) {
  const signalsUi = signals.map((signal) => (
    <div
      key={signal.id}
      style={{
        border: '1px solid #ccc',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor:
          signal.mood === 'green'
            ? '#e6ffe6'
            : signal.mood === 'yellow'
            ? '#fffbe6'
            : '#ffe6e6',
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
        <strong>Follow-Up Required:</strong>{' '}
        {signal.followUpRequired ? 'Yes' : 'No'}
      </p>
      <p>
        <strong>Created At:</strong>{' '}
        {new Date(signal.createdAt).toLocaleString()}
      </p>
      <p>
        <strong>Creator ID:</strong> {signal.creatorId}
      </p>
    </div>
  ));

  return <div className={styles.root}>{signalsUi}</div>;
}
