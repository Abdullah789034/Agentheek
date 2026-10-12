import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// GET /api/chats?username=... (Load all chats for this unique user)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.trim();

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const db = await getDb();
    const chatsCol = db.collection('chats');

    const chats = await chatsCol
      .find({ username })
      .sort({ updatedAt: -1 })
      .toArray();

    // Map away MongoDB _id to clean session objects
    const cleanChats = chats.map(({ _id, ...rest }) => rest);

    return NextResponse.json({ success: true, chats: cleanChats });
  } catch (error) {
    console.error('Chats GET error:', error);
    return NextResponse.json({ error: error.message || 'Failed to load chats' }, { status: 500 });
  }
}

// POST /api/chats (Save or update a chat session for this user)
export async function POST(request) {
  try {
    const body = await request.json();
    const { username, session } = body;

    if (!username || !session || !session.id) {
      return NextResponse.json(
        { error: 'Valid username and session with id are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const chatsCol = db.collection('chats');

    const payload = {
      id: session.id,
      username: username.trim(),
      title: session.title || 'Chat conversation',
      messages: session.messages || [],
      history: session.history || [],
      activeSkill: session.activeSkill || null,
      updatedAt: session.updatedAt || Date.now(),
    };

    await chatsCol.updateOne(
      { username: payload.username, id: payload.id },
      { $set: payload },
      { upsert: true }
    );

    return NextResponse.json({ success: true, chat: payload });
  } catch (error) {
    console.error('Chats POST error:', error);
    return NextResponse.json({ error: error.message || 'Failed to save chat' }, { status: 500 });
  }
}

// DELETE /api/chats?username=...&id=... (Delete a chat session)
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.trim();
    const id = searchParams.get('id')?.trim();

    if (!username || !id) {
      return NextResponse.json({ error: 'Username and session id are required' }, { status: 400 });
    }

    const db = await getDb();
    const chatsCol = db.collection('chats');

    await chatsCol.deleteOne({ username, id });

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error('Chats DELETE error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete chat' }, { status: 500 });
  }
}
