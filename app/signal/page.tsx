import CreateSignalForm from '@/components/create_signal_form/create-signal-form';
import SignalsView from '@/components/signals_view/signals-view';
import { Signal } from '@/types/signal';
import styles from './page.module.scss';
import { headers } from 'next/headers';
export default async function Page() {
  let signals: Signal[] = [];
  try {
    const h = await headers();
    const proto = h.get('x-forwarded-proto') ?? 'http';
    const host = h.get('host')!;
    const url = `${proto}://${host}/api/signals`;

    const res = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    signals = await res.json();
  } catch (error) {
    console.log('Error getting signals', error);
  }

  return (
    <div className={styles.root}>
      <CreateSignalForm />
      <SignalsView signals={signals} />
    </div>
  );
}
