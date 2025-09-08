import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export const revalidate = 0; // always fresh
export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  creator_id: string;
  mood: 'green' | 'yellow' | 'red';
  note: string;
  tags: string | null;
  follow_up_required: boolean;
  created_at: string | Date;
};

export async function GET() {
  try {
    const { rows } = await sql<Row>`
      SELECT
        id,
        creator_id,
        mood,
        note,
        tags,
        follow_up_required,
        created_at
      FROM signals
      ORDER BY created_at DESC;
    `;

    const signals = rows.map((r) => {
      const tagsArr =
        r.tags
          ?.split(',')
          .map((t) => t.trim())
          .filter(Boolean) ?? [];

      return {
        id: r.id,
        creatorId: r.creator_id,
        mood: r.mood,
        note: r.note,
        ...(tagsArr.length ? { tags: tagsArr } : {}),
        followUpRequired: r.follow_up_required,
        createdAt:
          typeof r.created_at === 'string'
            ? new Date(r.created_at).toISOString()
            : new Date(r.created_at).toISOString(),
      };
    });

    return NextResponse.json(signals, { status: 200 });
  } catch (err) {
    console.error('GET /api/signals failed:', err);
    return NextResponse.json(
      { error: 'Failed to fetch signals' },
      { status: 500 }
    );
  }
}
