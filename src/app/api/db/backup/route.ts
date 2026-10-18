import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export const dynamic = 'force-dynamic';

const COLLECTIONS_TO_BACKUP = [
  'members',
  'collections',
  'investments',
  'expenses',
  'transactions',
  'loans',
  'due_demands',
  'users',
  'notifications',
  'auditLogs',
  'documents',
  'permissions'
];

// GET: Export entire database snapshot
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();

    const exportData: Record<string, any[]> = {};
    const summary: Record<string, number> = {};
    let totalRecords = 0;

    for (const colName of COLLECTIONS_TO_BACKUP) {
      try {
        const docs = await db.collection(colName).find({}).project({ _id: 0 }).toArray();
        exportData[colName] = docs;
        summary[colName] = docs.length;
        totalRecords += docs.length;
      } catch (e: any) {
        console.warn(`Could not export collection ${colName}:`, e.message);
        exportData[colName] = [];
        summary[colName] = 0;
      }
    }

    const payload = {
      app: 'Friends Development Committee (FDC)',
      version: '1.0',
      database: 'New-FDC',
      exportedAt: new Date().toISOString(),
      totalRecords,
      summary,
      data: exportData
    };

    // Log the backup export event in backups collection
    try {
      await db.collection('backups').insertOne({
        id: `backup-${Date.now()}`,
        type: 'export',
        createdAt: new Date().toISOString(),
        totalRecords,
        summary,
        triggeredBy: 'Super Admin'
      });
    } catch (e) {}

    return NextResponse.json(payload, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="fdc_backup_${new Date().toISOString().split('T')[0]}.json"`
      }
    });
  } catch (error: any) {
    console.error('Database backup error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create backup' }, { status: 500 });
  }
}

// POST: Restore database from uploaded JSON payload
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mode = 'replace', data, restoredBy = 'Super Admin' } = body;

    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'Invalid backup file structure: missing data payload' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    const restoredSummary: Record<string, number> = {};
    let totalRestored = 0;

    for (const colName of COLLECTIONS_TO_BACKUP) {
      const docs = data[colName];
      if (!Array.isArray(docs)) continue;

      const col = db.collection(colName);

      // Clean documents to remove any stray _id fields
      const cleanedDocs = docs.map(({ _id, ...rest }: any) => rest);

      if (mode === 'replace') {
        // Clean wipe existing collection before restoring
        await col.deleteMany({});
        if (cleanedDocs.length > 0) {
          const insertResult = await col.insertMany(cleanedDocs);
          restoredSummary[colName] = insertResult.insertedCount;
          totalRestored += insertResult.insertedCount;
        } else {
          restoredSummary[colName] = 0;
        }
      } else {
        // Merge mode: upsert documents by id if present, else insert
        let count = 0;
        for (const doc of cleanedDocs) {
          if (doc.id) {
            await col.replaceOne({ id: doc.id }, doc, { upsert: true });
            count++;
          } else {
            await col.insertOne(doc);
            count++;
          }
        }
        restoredSummary[colName] = count;
        totalRestored += count;
      }
    }

    // Log the restore event into auditLogs & backups
    try {
      const now = new Date();
      await db.collection('auditLogs').insertOne({
        id: `audit-${Date.now()}`,
        userId: 'admin',
        userName: restoredBy,
        role: 'super_admin',
        action: `Restored database (${mode.toUpperCase()} mode). Total ${totalRestored} records across ${Object.keys(restoredSummary).length} collections.`,
        date: now.toISOString().split('T')[0],
        time: now.toLocaleTimeString(),
        ipAddress: 'System Action',
        device: 'Web Client'
      });
      await db.collection('backups').insertOne({
        id: `restore-${Date.now()}`,
        type: 'restore',
        createdAt: now.toISOString(),
        mode,
        totalRestored,
        summary: restoredSummary,
        restoredBy
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Database successfully restored (${mode} mode)`,
      mode,
      totalRestored,
      summary: restoredSummary
    });
  } catch (error: any) {
    console.error('Database restore error:', error);
    return NextResponse.json({ error: error.message || 'Failed to restore backup' }, { status: 500 });
  }
}
