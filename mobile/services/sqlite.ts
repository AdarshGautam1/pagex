import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export type ContentType = 'book' | 'note';

export interface DownloadRecord {
  id: string;
  content_id: string;
  content_type: ContentType;
  title: string;
  local_file_path: string;
  file_size: number;
  downloaded_at: string;
  last_opened_at: string | null;
  last_opened_page: number;
}

export interface ReadingPositionRecord {
  content_id: string;
  content_type: ContentType;
  last_opened_page: number;
  updated_at: string;
}

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * Initializes and returns the SQLite database instance safely with proper migrations.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase | null> {
  // If running on web, return null gracefully
  if (Platform.OS === 'web') {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const db = await SQLite.openDatabaseAsync('pagex_offline.db');

      // 1. Create downloads metadata table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS downloads (
          id TEXT PRIMARY KEY,
          content_id TEXT NOT NULL,
          content_type TEXT NOT NULL CHECK (content_type IN ('book', 'note')),
          title TEXT NOT NULL,
          local_file_path TEXT NOT NULL,
          file_size INTEGER NOT NULL DEFAULT 0,
          downloaded_at TEXT NOT NULL,
          last_opened_at TEXT,
          last_opened_page INTEGER NOT NULL DEFAULT 1,
          UNIQUE(content_id, content_type)
        );

        CREATE INDEX IF NOT EXISTS idx_downloads_lookup 
          ON downloads(content_id, content_type);

        -- Reading positions tracking (works for both offline & streaming reads)
        CREATE TABLE IF NOT EXISTS reading_positions (
          content_id TEXT NOT NULL,
          content_type TEXT NOT NULL CHECK (content_type IN ('book', 'note')),
          last_opened_page INTEGER NOT NULL DEFAULT 1,
          updated_at TEXT NOT NULL,
          PRIMARY KEY (content_id, content_type)
        );
      `);

      dbInstance = db;
      return db;
    } catch (err) {
      console.error('Failed to initialize SQLite database:', err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Retrieve download metadata for a specific book or note.
 */
export async function getDownloadRecord(
  contentId: string,
  contentType: ContentType
): Promise<DownloadRecord | null> {
  const db = await getDatabase();
  if (!db) return null;

  try {
    const row = await db.getFirstAsync<DownloadRecord>(
      'SELECT * FROM downloads WHERE content_id = ? AND content_type = ?',
      [contentId, contentType]
    );
    return row || null;
  } catch (err) {
    console.error('Error fetching download record from SQLite:', err);
    return null;
  }
}

/**
 * Retrieve all downloaded books and notes.
 */
export async function getAllDownloadRecords(): Promise<DownloadRecord[]> {
  const db = await getDatabase();
  if (!db) return [];

  try {
    const rows = await db.getAllAsync<DownloadRecord>(
      'SELECT * FROM downloads ORDER BY downloaded_at DESC'
    );
    return rows || [];
  } catch (err) {
    console.error('Error fetching all download records:', err);
    return [];
  }
}

/**
 * Insert or replace a download metadata record.
 */
export async function saveDownloadRecord(
  record: Omit<DownloadRecord, 'last_opened_at' | 'last_opened_page'> & {
    last_opened_at?: string | null;
    last_opened_page?: number;
  }
): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  const now = new Date().toISOString();
  const lastOpenedAt = record.last_opened_at || now;
  const lastOpenedPage = record.last_opened_page || 1;

  try {
    await db.runAsync(
      `INSERT INTO downloads (
        id, content_id, content_type, title, local_file_path, file_size, downloaded_at, last_opened_at, last_opened_page
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(content_id, content_type) DO UPDATE SET
        title = excluded.title,
        local_file_path = excluded.local_file_path,
        file_size = excluded.file_size,
        downloaded_at = excluded.downloaded_at`,
      [
        record.id,
        record.content_id,
        record.content_type,
        record.title,
        record.local_file_path,
        record.file_size,
        record.downloaded_at || now,
        lastOpenedAt,
        lastOpenedPage,
      ]
    );
  } catch (err) {
    console.error('Error saving download record to SQLite:', err);
    throw err;
  }
}

/**
 * Delete a download record from SQLite.
 */
export async function deleteDownloadRecord(
  contentId: string,
  contentType: ContentType
): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  try {
    await db.runAsync(
      'DELETE FROM downloads WHERE content_id = ? AND content_type = ?',
      [contentId, contentType]
    );
  } catch (err) {
    console.error('Error deleting download record from SQLite:', err);
    throw err;
  }
}

/**
 * Update the last read page position in SQLite.
 * Updates both the `reading_positions` table and the `downloads` table if downloaded.
 */
export async function saveReadingPosition(
  contentId: string,
  contentType: ContentType,
  pageNumber: number
): Promise<void> {
  const db = await getDatabase();
  if (!db) return;

  const now = new Date().toISOString();

  try {
    // 1. Update in reading_positions
    await db.runAsync(
      `INSERT INTO reading_positions (content_id, content_type, last_opened_page, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(content_id, content_type) DO UPDATE SET
         last_opened_page = excluded.last_opened_page,
         updated_at = excluded.updated_at`,
      [contentId, contentType, Math.max(1, pageNumber), now]
    );

    // 2. Also update in downloads table if record exists
    await db.runAsync(
      `UPDATE downloads
       SET last_opened_page = ?, last_opened_at = ?
       WHERE content_id = ? AND content_type = ?`,
      [Math.max(1, pageNumber), now, contentId, contentType]
    );
  } catch (err) {
    console.error('Error saving reading position to SQLite:', err);
  }
}

/**
 * Get the last reading page for a book or note. Defaults to 1 if not previously opened.
 */
export async function getReadingPosition(
  contentId: string,
  contentType: ContentType
): Promise<number> {
  const db = await getDatabase();
  if (!db) return 1;

  try {
    // First check reading_positions
    const pos = await db.getFirstAsync<ReadingPositionRecord>(
      'SELECT last_opened_page FROM reading_positions WHERE content_id = ? AND content_type = ?',
      [contentId, contentType]
    );
    if (pos && pos.last_opened_page > 0) {
      return pos.last_opened_page;
    }

    // Fallback to downloads table
    const download = await db.getFirstAsync<DownloadRecord>(
      'SELECT last_opened_page FROM downloads WHERE content_id = ? AND content_type = ?',
      [contentId, contentType]
    );
    if (download && download.last_opened_page > 0) {
      return download.last_opened_page;
    }
  } catch (err) {
    console.error('Error reading position from SQLite:', err);
  }

  return 1;
}
