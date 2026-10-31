import { NextResponse } from 'next/server';
import clientPromise from '../../../../lib/mongodb';
import webpush from 'web-push';

export const dynamic = 'force-dynamic';

const DEFAULT_VAPID_PUBLIC_KEY =
  'BNnVdd1nN7aYXnJ7czvMz9El_eVXDTImVa2Yj9Pdn9WZWp2eVg4SyYcuNg_yBLoUEolchh6-Vu837YX-jN9ugrU';
const DEFAULT_VAPID_PRIVATE_KEY =
  '3glMG6BYmcv92o2Flh5IZfOmAP8ei0FMUGyhl4XId4Y';
const DEFAULT_VAPID_SUBJECT =
  'mailto:21223203087@cse.bubt.edu.bd';

function getWebPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT;

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export async function POST(request: Request) {
  try {
    getWebPushConfig();

    const body = await request.json();
    const { title, message, url, icon, badge, targetUserId, targetRole } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    const payload = JSON.stringify({
      title,
      body: message,
      icon: icon || '/icons/icon-192x192.png',
      badge: badge || '/icons/icon-72x72.png',
      data: {
        url: url || '/dashboard',
        date: new Date().toISOString(),
      },
    });

    const client = await clientPromise;
    const db = client.db();
    const col = db.collection('push_subscriptions');

    // Build filter for recipients
    const filter: Record<string, any> = {};
    if (targetUserId && targetUserId !== 'all') {
      filter.$or = [
        { userId: targetUserId },
        { memberId: targetUserId },
        { userId: targetUserId.replace('u-', 'm-') },
        { memberId: targetUserId.replace('m-', 'u-') },
      ];
    } else if (targetRole && targetRole !== 'all') {
      filter.role = targetRole;
    }

    const subscriptions = await col.find(filter).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        sentCount: 0,
        message: 'No active push subscriptions found for this target.',
      });
    }

    let successCount = 0;
    const expiredEndpoints: string[] = [];

    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: sub.keys,
          };
          await webpush.sendNotification(pushSubscription as any, payload);
          successCount++;
        } catch (err: any) {
          // If subscription is expired or unsubscribed, mark for deletion (410 Gone / 404 Not Found)
          if (err.statusCode === 410 || err.statusCode === 404) {
            expiredEndpoints.push(sub.endpoint);
          } else {
            console.warn('Error sending push to endpoint:', sub.endpoint, err.message);
          }
        }
      })
    );

    // Clean up expired tokens
    if (expiredEndpoints.length > 0) {
      await col.deleteMany({ endpoint: { $in: expiredEndpoints } });
    }

    return NextResponse.json({
      success: true,
      sentCount: successCount,
      totalAttempted: subscriptions.length,
      removedExpired: expiredEndpoints.length,
      message: `Push notification sent to ${successCount} device(s).`,
    });
  } catch (error: any) {
    console.error('Error dispatching push notifications:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
