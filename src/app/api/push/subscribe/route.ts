import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';

export const dynamic = 'force-dynamic';

// GET: Return public VAPID key to the client
export async function GET() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    return NextResponse.json({ error: 'VAPID public key not configured' }, { status: 500 });
  }
  return NextResponse.json({ publicKey });
}

// POST: Save or update user push subscription token
export async function POST(request: Request) {
  try {
    const { subscription, userId, memberId, role, userAgent } = await request.json();

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid push subscription object' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection('push_subscriptions');

    const now = new Date().toISOString();

    await col.updateOne(
      { endpoint: subscription.endpoint },
      {
        $set: {
          endpoint: subscription.endpoint,
          keys: subscription.keys,
          userId: userId || null,
          memberId: memberId || null,
          role: role || 'member',
          userAgent: userAgent || '',
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, message: 'Push subscription saved successfully' });
  } catch (error: any) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Remove push subscription (e.g. on logout or toggle off)
export async function DELETE(request: Request) {
  try {
    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint is required' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection('push_subscriptions');

    await col.deleteOne({ endpoint });

    return NextResponse.json({ success: true, message: 'Push subscription removed' });
  } catch (error: any) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
