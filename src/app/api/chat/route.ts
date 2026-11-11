import { NextResponse } from 'next/server';
import clientPromise from '../../../lib/mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(Number(searchParams.get('limit') || 150), 300);
    const after = searchParams.get('after');

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('chat_messages');

    let query: any = {};
    if (after) {
      query.createdAt = { $gt: after };
    }

    // Fetch messages sorted newest first, then reverse to chronological order
    const docs = await collection
      .find(query)
      .project({ _id: 0 })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    const messages = docs.reverse();

    return NextResponse.json({
      success: true,
      messages,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });
  } catch (error: any) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json({ error: error.message, messages: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = (body.message || '').trim();

    if (!text) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    if (text.length > 2000) {
      return NextResponse.json({ error: 'Message exceeds 2000 characters limit' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('chat_messages');

    const newMsg = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      senderId: body.senderId || 'user',
      senderName: body.senderName || 'Anonymous',
      senderRole: body.senderRole || 'member',
      senderMemberId: body.senderMemberId || undefined,
      senderAvatar: body.senderAvatar || undefined,
      message: text,
      createdAt: new Date().toISOString(),
      reactions: {}
    };

    await collection.insertOne({ ...newMsg });

    return NextResponse.json({ success: true, message: newMsg });
  } catch (error: any) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { messageId, emoji, userName } = await req.json();
    if (!messageId || !emoji || !userName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const collection = db.collection('chat_messages');

    const msg = await collection.findOne({ id: messageId });
    if (!msg) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const reactions = msg.reactions || {};
    const users: string[] = reactions[emoji] || [];

    let updatedUsers: string[];
    if (users.includes(userName)) {
      updatedUsers = users.filter((u: string) => u !== userName);
    } else {
      updatedUsers = [...users, userName];
    }

    if (updatedUsers.length > 0) {
      reactions[emoji] = updatedUsers;
    } else {
      delete reactions[emoji];
    }

    await collection.updateOne({ id: messageId }, { $set: { reactions } });

    return NextResponse.json({ success: true, reactions });
  } catch (error: any) {
    console.error('Error toggling reaction:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing message id' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    await db.collection('chat_messages').deleteOne({ id });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error: any) {
    console.error('Error deleting chat message:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
