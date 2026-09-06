import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export const dynamic = 'force-dynamic';

// Helper to get collection connection
async function getCollection(name: string) {
  const client = await clientPromise;
  const db = client.db(); // uses default database in connection string (New-FDC)
  return db.collection(name);
}

// GET: Fetch all documents from a collection
export async function GET(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection: colName } = await params;
    const col = await getCollection(colName);
    const data = await col.find({}).project({ _id: 0 }).toArray();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Insert single or multiple documents
export async function POST(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection: colName } = await params;
    const body = await request.json();
    const col = await getCollection(colName);

    if (Array.isArray(body)) {
      if (body.length === 0) return NextResponse.json({ success: true, count: 0 });
      // Clean any existing _id to avoid duplicate key errors
      const cleaned = body.map(({ _id, ...rest }) => rest);
      const result = await col.insertMany(cleaned);
      return NextResponse.json({ success: true, insertedCount: result.insertedCount });
    } else {
      const { _id, ...cleaned } = body;
      const result = await col.insertOne(cleaned);
      return NextResponse.json({ success: true, insertedId: result.insertedId });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update matching documents
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection: colName } = await params;
    const body = await request.json();
    const { filter, update } = body;

    if (!filter || !update) {
      return NextResponse.json({ error: 'Filter and update parameters are required' }, { status: 400 });
    }

    const col = await getCollection(colName);
    const { _id, ...cleanedUpdate } = update;
    const result = await col.updateMany(filter, { $set: cleanedUpdate });
    return NextResponse.json({ success: true, matchedCount: result.matchedCount, modifiedCount: result.modifiedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete matching documents
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection: colName } = await params;
    const body = await request.json();
    const { filter } = body;

    if (!filter) {
      return NextResponse.json({ error: 'Filter criteria is required for deletion' }, { status: 400 });
    }

    const col = await getCollection(colName);
    const result = await col.deleteMany(filter);
    return NextResponse.json({ success: true, deletedCount: result.deletedCount });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
