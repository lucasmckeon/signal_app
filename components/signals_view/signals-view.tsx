/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useActionState } from 'react';
import {
  ReadonlyURLSearchParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';
import styles from './signals-view.module.scss';
import type { Signal } from '@/types/signal';
import { markAsFollowedUp } from '@/app/actions';
import { FollowUpActionResult, FollowUp } from '@/types/follow_up';
import { USER_ID } from '@/constants';

// ---------------------------
// Filters: types & constants
// ---------------------------
type Mood = 'green' | 'yellow' | 'red';
type RequiredOpt = 'any' | 'true' | 'false';
type HasOpt = 'any' | 'has' | 'none';
type WhenOpt = 'all' | '24h' | '7d' | '30d';
type ByOpt = 'any' | 'me';

type Filters = {
  mood: Mood[]; // multi-select
  tags: string[]; // OR semantics
  required: RequiredOpt;
  has: HasOpt;
  when: WhenOpt;
  by: ByOpt;
};

const ALLOWED_MOODS: Mood[] = ['green', 'yellow', 'red'];
const DEFAULT_FILTERS: Filters = {
  mood: [],
  tags: [],
  required: 'any',
  has: 'any',
  when: 'all',
  by: 'any',
};

// ---------------------------
// Helpers (parse/sanitize)
// ---------------------------
const csvToList = (v: string | null) =>
  (v ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

function parseFilters(sp: ReadonlyURLSearchParams): Filters {
  const rawMood = csvToList(sp.get('mood'));
  const mood = rawMood.filter((m): m is Mood =>
    ALLOWED_MOODS.includes(m as Mood)
  );

  const tags = csvToList(sp.get('tags'));

  const required = ((): RequiredOpt => {
    const v = (sp.get('required') ?? 'any').toLowerCase();
    return v === 'true' || v === 'false' ? (v as RequiredOpt) : 'any';
  })();

  const has = ((): HasOpt => {
    const v = (sp.get('has') ?? 'any').toLowerCase();
    return v === 'has' || v === 'none' ? (v as HasOpt) : 'any';
  })();

  const when = ((): WhenOpt => {
    const v = (sp.get('when') ?? 'all').toLowerCase();
    return v === '24h' || v === '7d' || v === '30d' ? (v as WhenOpt) : 'all';
  })();

  const by = ((): ByOpt => {
    const v = (sp.get('by') ?? 'any').toLowerCase();
    return v === 'me' ? 'me' : 'any';
  })();

  return { mood, tags, required, has, when, by };
}

function toSearchParams(filters: Filters): URLSearchParams {
  const qp = new URLSearchParams();

  if (filters.mood.length)
    qp.set('mood', Array.from(new Set(filters.mood)).join(','));
  if (filters.tags.length)
    qp.set('tags', Array.from(new Set(filters.tags)).join(','));
  if (filters.required !== 'any') qp.set('required', filters.required);
  if (filters.has !== 'any') qp.set('has', filters.has);
  if (filters.when !== 'all') qp.set('when', filters.when);
  if (filters.by !== 'any') qp.set('by', filters.by);

  return qp;
}

function sinceFor(when: WhenOpt): number | null {
  const now = Date.now();
  switch (when) {
    case '24h':
      return now - 24 * 60 * 60 * 1000;
    case '7d':
      return now - 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return now - 30 * 24 * 60 * 60 * 1000;
    default:
      return null; // 'all'
  }
}

function normalizeTagList(tags?: string[] | null): string[] {
  return (tags ?? []).map((t) => t.toLowerCase());
}

// Small debounce helper for text input
function useDebouncedCallback<T extends any[]>(
  fn: (...args: T) => void,
  ms: number
) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  return (...args: T) => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), ms);
  };
}

// ---------------------------
// Main view
// ---------------------------
export default function SignalsView({ signals }: { signals: Signal[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [bySignal, setBySignal] = useState<Map<string, FollowUp>>(new Map());
  const [error, setError] = useState<string | null>(null);

  // identity for "Created by: Me"
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let stored = localStorage.getItem(USER_ID);
    if (!stored) {
      stored = crypto.randomUUID();
      localStorage.setItem(USER_ID, stored);
    }
    setUserId(stored);
  }, []);

  const fetchFollowUps = async () => {
    try {
      setError(null);
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

  const filters = useMemo(() => parseFilters(searchParams), [searchParams]);

  // Compute filtered list (AND logic)
  const filtered = useMemo(() => {
    const moods = new Set(filters.mood);
    const wantMood = filters.mood.length > 0;
    const wantTags = filters.tags.length > 0;
    const filterTags = new Set(filters.tags);
    const wantReq = filters.required !== 'any';
    const wantHas = filters.has !== 'any';
    const wantWhen = filters.when !== 'all';
    const wantBy = filters.by === 'me';
    const since = sinceFor(filters.when);

    return signals.filter((s) => {
      // Mood
      if (wantMood && !moods.has(s.mood.toLowerCase() as Mood)) return false;

      // Tags (OR semantics)
      if (wantTags) {
        const sTags = new Set(normalizeTagList(s.tags));
        let tagHit = false;
        for (const t of filterTags)
          if (sTags.has(t)) {
            tagHit = true;
            break;
          }
        if (!tagHit) return false;
      }

      // Follow-up required
      if (wantReq) {
        const want = filters.required === 'true';
        if (Boolean(s.followUpRequired) !== want) return false;
      }

      // Has follow-up (derived)
      if (wantHas) {
        // Rule: if followUpRequired === false, treat as if follow-up does NOT exist
        const derivedHas =
          s.followUpRequired === false ? false : Boolean(bySignal.get(s.id));
        const needHas = filters.has === 'has';
        if (derivedHas !== needHas) return false;
      }

      // Timeframe
      if (wantWhen && since !== null) {
        const createdAt = new Date(s.createdAt).getTime();
        if (isNaN(createdAt) || createdAt < since) return false;
      }

      // Created by
      if (wantBy) {
        if (!userId) return false; // wait for identity before showing "me"
        if (s.creatorId !== userId) return false;
      }

      return true;
    });
  }, [signals, bySignal, filters, userId]);

  // ---------------------------
  // Mutators that write to URL
  // ---------------------------
  const applyFilters = (next: Partial<Filters>) => {
    const merged: Filters = {
      ...DEFAULT_FILTERS,
      ...filters,
      ...next,
      // sanitize on write (lowercase, dedupe)
      mood: (next.mood ?? filters.mood)
        .map((m) => m.toLowerCase() as Mood)
        .filter((m) => ALLOWED_MOODS.includes(m)),
      tags: Array.from(
        new Set((next.tags ?? filters.tags).map((t) => t.toLowerCase()))
      ),
    };
    const qp = toSearchParams(merged);
    router.replace(`${pathname}${qp.toString() ? `?${qp.toString()}` : ''}`);
  };

  const debouncedTagsUpdate = useDebouncedCallback((value: string) => {
    const tags = csvToList(value);
    applyFilters({ tags });
  }, 300);

  // Keep a local text field mirror for tags so typing is responsive
  const [tagsInput, setTagsInput] = useState<string>('');
  useEffect(() => {
    setTagsInput(filters.tags.join(', '));
  }, [filters.tags]);

  const total = signals.length;
  const shown = filtered.length;

  return (
    <div className={styles.root}>
      <FiltersToolbar
        filters={filters}
        tagsInput={tagsInput}
        onChangeMood={(mood, checked) => {
          const set = new Set(filters.mood);
          if (checked) set.add(mood);
          else set.delete(mood);
          applyFilters({ mood: Array.from(set) as Mood[] });
        }}
        onChangeTags={(val) => {
          setTagsInput(val);
          debouncedTagsUpdate(val);
        }}
        onChangeRequired={(v) => applyFilters({ required: v })}
        onChangeHas={(v) => applyFilters({ has: v })}
        onChangeWhen={(v) => applyFilters({ when: v })}
        onChangeBy={(v) => applyFilters({ by: v })}
        onClear={() => router.replace(pathname)}
        resultText={`${shown} of ${total}`}
      />

      {filtered.map((signal) => (
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

      {shown === 0 && (
        <p className={styles.empty}>No results match your filters.</p>
      )}
    </div>
  );
}

// ---------------------------
// Toolbar Component
// ---------------------------
function FiltersToolbar(props: {
  filters: Filters;
  tagsInput: string;
  onChangeMood: (mood: Mood, checked: boolean) => void;
  onChangeTags: (value: string) => void;
  onChangeRequired: (v: RequiredOpt) => void;
  onChangeHas: (v: HasOpt) => void;
  onChangeWhen: (v: WhenOpt) => void;
  onChangeBy: (v: ByOpt) => void;
  onClear: () => void;
  resultText: string;
}) {
  const { filters } = props;
  const moodSet = new Set(filters.mood);

  return (
    <div
      className={styles.toolbar}
      style={{
        display: 'flex',
        gap: '1rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: '1rem',
      }}
    >
      {/* Mood */}
      <fieldset style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
        <legend style={{ fontWeight: 600 }}>Mood</legend>
        {ALLOWED_MOODS.map((m) => (
          <label
            key={m}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.25rem',
            }}
          >
            <input
              type="checkbox"
              checked={moodSet.has(m)}
              onChange={(e) => props.onChangeMood(m, e.currentTarget.checked)}
            />
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </label>
        ))}
      </fieldset>

      {/* Tags (comma-separated) */}
      <label
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}
      >
        <span style={{ fontWeight: 600 }}>Tags</span>
        <input
          type="text"
          placeholder="urgent, billing"
          value={props.tagsInput}
          onChange={(e) => props.onChangeTags(e.currentTarget.value)}
          onBlur={(e) => props.onChangeTags(e.currentTarget.value)} // ensure sync on blur
          style={{ minWidth: '16rem' }}
        />
      </label>

      {/* Required */}
      <label
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}
      >
        <span style={{ fontWeight: 600 }}>Follow Up Required</span>
        <select
          value={filters.required}
          onChange={(e) =>
            props.onChangeRequired(e.currentTarget.value as RequiredOpt)
          }
        >
          <option value="any">Any</option>
          <option value="true">Required</option>
          <option value="false">Not required</option>
        </select>
      </label>

      {/* Has Follow-up */}
      <label
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}
      >
        <span style={{ fontWeight: 600 }}>Has Followed-up</span>
        <select
          value={filters.has}
          onChange={(e) => props.onChangeHas(e.currentTarget.value as HasOpt)}
        >
          <option value="any">Any</option>
          <option value="has">Has</option>
          <option value="none">None</option>
        </select>
      </label>

      {/* Timeframe */}
      <label
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}
      >
        <span style={{ fontWeight: 600 }}>When Created</span>
        <select
          value={filters.when}
          onChange={(e) => props.onChangeWhen(e.currentTarget.value as WhenOpt)}
        >
          <option value="all">All time</option>
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
        </select>
      </label>

      {/* Created by */}
      <label
        style={{ display: 'inline-flex', alignItems: 'center', gap: '.5rem' }}
      >
        <span style={{ fontWeight: 600 }}>Created by</span>
        <select
          value={filters.by}
          onChange={(e) => props.onChangeBy(e.currentTarget.value as ByOpt)}
        >
          <option value="any">Anyone</option>
          <option value="me">Me</option>
        </select>
      </label>

      {/* Result count + Clear */}
      <div
        style={{
          marginLeft: 'auto',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '.75rem',
        }}
      >
        <span className={styles.count} aria-live="polite">
          {props.resultText}
        </span>
        <button type="button" onClick={props.onClear}>
          Clear filters
        </button>
      </div>
    </div>
  );
}

// ---------------------------
// Existing card + action
// ---------------------------
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

  // Derived has-follow-up (for display only; filter logic is in parent)
  const hasFollow =
    signal.followUpRequired === false ? false : Boolean(followUp);

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
        (hasFollow ? (
          <p>
            <strong>Followed Up:</strong>{' '}
            {followUp ? new Date(followUp.followedUpAt).toLocaleString() : '—'}
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
