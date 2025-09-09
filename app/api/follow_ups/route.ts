import { sql } from '@vercel/postgres';
import { NextResponse } from 'next/server';

//TODO do we need these?
export const revalidate = 0;
export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  signal_id: string;
  user_id: string;
  followed_up_at: string | Date;
};

export async function GET() {
  try {
    //Return all follow up entries, followedUpAt will always have
    //value as only signals that were followed up shows here
    const { rows } = await sql<Row>`
      SELECT
        id,
        signal_id,
        user_id,
        followed_up_at
      FROM follow_ups
      ORDER BY followed_up_at DESC;
    `;

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
