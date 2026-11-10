import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export const dynamic = 'force-dynamic';

const COLLECTIONS = [
  'members',
  'collections',
  'investments',
  'expenses',
  'transactions',
  'auditLogs',
  'notifications',
  'documents',
  'users',
  'permissions',
  'due_demands',
  'loans',
  'fine_waivers',
  'trash'
];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Query all collections in parallel on the server using a single connection pool
    const entries = await Promise.all(
      COLLECTIONS.map(async (name) => {
        try {
          const docs = await db.collection(name).find({}).project({ _id: 0 }).toArray();
          return [name, docs];
        } catch (e) {
          return [name, []];
        }
      })
    );

    const payload = Object.fromEntries(entries);

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'private, no-cache, stale-while-revalidate=30'
      }
    });
  } catch (error: any) {
    console.error('Error in bootstrap data fetch:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
