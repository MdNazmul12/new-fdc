import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

export const REQUIRED_COLLECTIONS = [
  'members',
  'collections',
  'investments',
  'expenses',
  'transactions',
  'loans',
  'due_demands',
  'fine_waivers',
  'users',
  'permissions',
  'notifications',
  'documents',
  'auditLogs',
  'push_subscriptions',
  'backups',
  'trash'
];

let collectionsEnsured = false;

async function ensureCollectionsExist(force = false) {
  if (collectionsEnsured && !force) {
    return { status: 'already_initialized', collections: REQUIRED_COLLECTIONS, created: [] };
  }
  const client = await clientPromise;
  const db = client.db();
  
  const existing = await db.listCollections().toArray();
  const existingSet = new Set(existing.map(c => c.name));

  const createdList: string[] = [];
  for (const name of REQUIRED_COLLECTIONS) {
    if (!existingSet.has(name)) {
      try {
        await db.createCollection(name);
        createdList.push(name);
        existingSet.add(name);
      } catch (err: any) {
        // NamespaceExists or concurrent creation is safe to ignore
        console.warn(`Collection ${name} initialization note:`, err.message);
      }
    }
  }

  collectionsEnsured = true;

  return {
    database: db.databaseName,
    collections: Array.from(existingSet),
    created: createdList
  };
}

// GET: Check MongoDB connection & auto-create missing collections
export async function GET() {
  try {
    const result = await ensureCollectionsExist();
    return NextResponse.json({ 
      status: 'connected',
      ...result
    });
  } catch (error: any) {
    console.error('MongoDB connection / collection init error:', error);
    return NextResponse.json({ 
      status: 'failed',
      error: error.message 
    }, { status: 500 });
  }
}

// POST: Explicitly initialize or re-verify all tables
export async function POST() {
  try {
    const result = await ensureCollectionsExist();
    return NextResponse.json({ 
      success: true,
      message: 'All database collections successfully verified and created if missing.',
      ...result
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
