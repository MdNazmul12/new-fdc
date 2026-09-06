import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const collections = await db.listCollections().toArray();
    return NextResponse.json({ 
      status: 'connected',
      collections: collections.map((c) => c.name) 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'failed',
      error: error.message 
    }, { status: 500 });
  }
}
