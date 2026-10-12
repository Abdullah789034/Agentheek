import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

// Clean and validate username
function validateUsername(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const username = raw.trim();
  // Allow letters, numbers, underscores, and hyphens; 2 to 30 chars
  if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
    return null;
  }
  return username;
}

// Ensure unique index exists on username
async function ensureIndex(db) {
  try {
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('chats').createIndex({ username: 1, id: 1 });
  } catch (err) {
    // Index may already exist
  }
}

// GET /api/auth?username=... (Check user status or fetch profile)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUsername = searchParams.get('username');
    const username = validateUsername(rawUsername);

    if (!username) {
      return NextResponse.json({ error: 'Valid username required' }, { status: 400 });
    }

    const db = await getDb();
    await ensureIndex(db);

    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return NextResponse.json({ exists: false, username }, { status: 404 });
    }

    return NextResponse.json({ exists: true, user: { username: user.username, createdAt: user.createdAt } });
  } catch (error) {
    console.error('Auth GET error:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

// POST /api/auth (Login or Auto-Register by unique username)
export async function POST(request) {
  try {
    const body = await request.json();
    const username = validateUsername(body?.username);

    if (!username) {
      return NextResponse.json(
        { error: 'Username must be 2-30 characters and contain only letters, numbers, hyphens, or underscores' },
        { status: 400 }
      );
    }

    const db = await getDb();
    await ensureIndex(db);

    const usersCol = db.collection('users');
    let user = await usersCol.findOne({ username });

    if (!user) {
      // Create new user
      const now = new Date();
      await usersCol.insertOne({
        username,
        createdAt: now,
        updatedAt: now,
      });
      user = { username, createdAt: now };
    }

    return NextResponse.json({
      success: true,
      user: { username: user.username, createdAt: user.createdAt },
    });
  } catch (error) {
    console.error('Auth POST error:', error);
    return NextResponse.json({ error: error.message || 'Auth failed' }, { status: 500 });
  }
}

// PUT /api/auth (Edit/Rename unique username and update all corresponding chats)
export async function PUT(request) {
  try {
    const body = await request.json();
    const oldUsername = validateUsername(body?.oldUsername);
    const newUsername = validateUsername(body?.newUsername);

    if (!oldUsername || !newUsername) {
      return NextResponse.json(
        { error: 'Both oldUsername and valid newUsername are required' },
        { status: 400 }
      );
    }

    if (oldUsername === newUsername) {
      return NextResponse.json({ success: true, username: newUsername });
    }

    const db = await getDb();
    await ensureIndex(db);

    const usersCol = db.collection('users');
    const chatsCol = db.collection('chats');

    // Check if newUsername is already taken
    const existing = await usersCol.findOne({ username: newUsername });
    if (existing) {
      return NextResponse.json(
        { error: `Username "${newUsername}" is already taken. Please choose another.` },
        { status: 409 }
      );
    }

    // Check if old user exists, if not create record
    const oldUser = await usersCol.findOne({ username: oldUsername });
    const now = new Date();
    if (oldUser) {
      await usersCol.updateOne(
        { username: oldUsername },
        { $set: { username: newUsername, updatedAt: now } }
      );
    } else {
      await usersCol.insertOne({
        username: newUsername,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Update all chats corresponding to the old username to the new username
    const updateResult = await chatsCol.updateMany(
      { username: oldUsername },
      { $set: { username: newUsername, updatedAt: Date.now() } }
    );

    return NextResponse.json({
      success: true,
      username: newUsername,
      updatedChatsCount: updateResult.modifiedCount,
    });
  } catch (error) {
    console.error('Auth PUT error:', error);
    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Username is already taken. Please pick a unique username.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message || 'Failed to update username' }, { status: 500 });
  }
}
