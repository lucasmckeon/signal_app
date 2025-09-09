import { sql } from '@vercel/postgres';
import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  signal_id: string;
  user_id: string;
  followed_up_at: string | Date;
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const signalId = searchParams.get('signalId');

  try {
    let rows: Row[] = [];

    if (signalId) {
      const result = await sql<Row>`
        SELECT id, signal_id, user_id, followed_up_at
        FROM follow_ups
        WHERE signal_id = ${signalId}
      `;
      if (result.rowCount && result.rowCount > 1) {
        //TODO
        //Log to sentry that more than one row exists when there
        //should only be one. Think more about this later
      }
      rows = result.rows;
    } else {
      const result = await sql<Row>`
        SELECT id, signal_id, user_id, followed_up_at
        FROM follow_ups
        ORDER BY followed_up_at DESC;
      `;
      rows = result.rows;
    }

    const followUps = rows.map((r) => ({
      id: r.id,
      signalId: r.signal_id,
      userId: r.user_id,
      followedUpAt: new Date(r.followed_up_at).toISOString(),
    }));

    return NextResponse.json(followUps, { status: 200 });
  } catch (error) {
    console.error('GET /api/follow-ups failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch follow-ups' },
      { status: 500 }
    );
  }
}
