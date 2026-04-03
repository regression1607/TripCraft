import * as SQLite from 'expo-sqlite';
import { chatAPI } from './chatApi';

let db = null;

async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('tripcraft_chat.db');
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS offline_messages (
        id TEXT PRIMARY KEY,
        conversationId TEXT NOT NULL,
        senderId TEXT,
        senderName TEXT,
        text TEXT NOT NULL,
        type TEXT DEFAULT 'text',
        metadata TEXT,
        createdAt INTEGER NOT NULL,
        synced INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS offline_conversations (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);
  }
  return db;
}

// ─── MESSAGES ───────────────────────────────────────────────────────────────

// Save message locally (offline send or BLE received)
export async function saveOfflineMessage(message) {
  const database = await getDB();
  await database.runAsync(
    `INSERT OR REPLACE INTO offline_messages
     (id, conversationId, senderId, senderName, text, type, metadata, createdAt, synced)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      message.id,
      message.conversationId,
      message.senderId || '',
      message.senderName || '',
      message.text,
      message.type || 'text',
      JSON.stringify(message.metadata || null),
      message.createdAt || Date.now(),
    ]
  );
}

// Get messages for a conversation (offline reading)
export async function getOfflineMessages(conversationId) {
  const database = await getDB();
  const rows = await database.getAllAsync(
    'SELECT * FROM offline_messages WHERE conversationId = ? ORDER BY createdAt ASC',
    [conversationId]
  );
  return rows.map(r => ({
    _id: r.id,
    conversationId: r.conversationId,
    senderId: r.senderId,
    senderName: r.senderName,
    text: r.text,
    type: r.type,
    metadata: r.metadata ? JSON.parse(r.metadata) : null,
    createdAt: new Date(r.createdAt).toISOString(),
    isOffline: true,
    synced: r.synced === 1,
  }));
}

// Get all pending (unsynced) messages
export async function getPendingMessages() {
  const database = await getDB();
  return database.getAllAsync('SELECT * FROM offline_messages WHERE synced = 0 ORDER BY createdAt ASC');
}

// Sync all pending messages to server
export async function syncPendingMessages() {
  const pending = await getPendingMessages();
  if (pending.length === 0) return 0;

  const database = await getDB();
  let synced = 0;

  for (const msg of pending) {
    try {
      await chatAPI.sendMessage(msg.conversationId, {
        text: msg.text,
        type: msg.type,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
      });
      await database.runAsync('UPDATE offline_messages SET synced = 1 WHERE id = ?', [msg.id]);
      synced++;
    } catch (e) {
      console.log('[OFFLINE] Sync failed for:', msg.id);
      break; // Stop on first failure to maintain order
    }
  }

  console.log(`[OFFLINE] Synced ${synced}/${pending.length} messages`);
  return synced;
}

// ─── CONVERSATIONS CACHE ────────────────────────────────────────────────────

export async function cacheConversations(conversations) {
  const database = await getDB();
  for (const conv of conversations) {
    await database.runAsync(
      'INSERT OR REPLACE INTO offline_conversations (id, data, updatedAt) VALUES (?, ?, ?)',
      [conv._id, JSON.stringify(conv), Date.now()]
    );
  }
}

export async function getCachedConversations() {
  const database = await getDB();
  const rows = await database.getAllAsync('SELECT * FROM offline_conversations ORDER BY updatedAt DESC');
  return rows.map(r => JSON.parse(r.data));
}

// ─── CLEANUP ────────────────────────────────────────────────────────────────

export async function clearOfflineData() {
  const database = await getDB();
  await database.execAsync('DELETE FROM offline_messages; DELETE FROM offline_conversations;');
}
