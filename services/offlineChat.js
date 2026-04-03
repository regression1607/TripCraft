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

// Save message locally when offline
export async function saveOfflineMessage(message) {
  const database = await getDB();
  await database.runAsync(
    'INSERT OR REPLACE INTO offline_messages (id, conversationId, text, type, metadata, createdAt, synced) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [message.id, message.conversationId, message.text, message.type || 'text', JSON.stringify(message.metadata || null), Date.now()]
  );
}

// Get pending (unsynced) messages
export async function getPendingMessages() {
  const database = await getDB();
  return database.getAllAsync('SELECT * FROM offline_messages WHERE synced = 0 ORDER BY createdAt ASC');
}

// Sync pending messages to server
export async function syncPendingMessages() {
  const pending = await getPendingMessages();
  const database = await getDB();

  for (const msg of pending) {
    try {
      await chatAPI.sendMessage(msg.conversationId, {
        text: msg.text,
        type: msg.type,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : undefined,
      });
      await database.runAsync('UPDATE offline_messages SET synced = 1 WHERE id = ?', [msg.id]);
    } catch (e) {
      console.log('[OFFLINE] Failed to sync message:', msg.id);
      break; // Stop on first failure to maintain order
    }
  }
}

// Cache conversations locally for offline reading
export async function cacheConversations(conversations) {
  const database = await getDB();
  for (const conv of conversations) {
    await database.runAsync(
      'INSERT OR REPLACE INTO offline_conversations (id, data, updatedAt) VALUES (?, ?, ?)',
      [conv._id, JSON.stringify(conv), Date.now()]
    );
  }
}

// Get cached conversations
export async function getCachedConversations() {
  const database = await getDB();
  const rows = await database.getAllAsync('SELECT * FROM offline_conversations ORDER BY updatedAt DESC');
  return rows.map(r => JSON.parse(r.data));
}

// Clear all offline data
export async function clearOfflineData() {
  const database = await getDB();
  await database.execAsync('DELETE FROM offline_messages; DELETE FROM offline_conversations;');
}
