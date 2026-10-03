import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import {
  ContentType,
  DownloadRecord,
  getDownloadRecord,
  getAllDownloadRecords,
  saveDownloadRecord,
  deleteDownloadRecord,
  getReadingPosition,
  saveReadingPosition,
} from './sqlite';

const BASE_DIR = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}pagex/` : '';
const BOOKS_DIR = `${BASE_DIR}books/`;
const NOTES_DIR = `${BASE_DIR}notes/`;

/**
 * Ensure persistent download directories exist.
 */
async function ensureDirectoriesExist(): Promise<void> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) return;

  try {
    const baseInfo = await FileSystem.getInfoAsync(BASE_DIR);
    if (!baseInfo.exists) {
      await FileSystem.makeDirectoryAsync(BASE_DIR, { intermediates: true });
    }

    const booksInfo = await FileSystem.getInfoAsync(BOOKS_DIR);
    if (!booksInfo.exists) {
      await FileSystem.makeDirectoryAsync(BOOKS_DIR, { intermediates: true });
    }

    const notesInfo = await FileSystem.getInfoAsync(NOTES_DIR);
    if (!notesInfo.exists) {
      await FileSystem.makeDirectoryAsync(NOTES_DIR, { intermediates: true });
    }
  } catch (err) {
    console.warn('Could not ensure download directories:', err);
  }
}

/**
 * Returns the deterministic local file path for a book or community note.
 */
export function getLocalFilePath(contentId: string, contentType: ContentType): string {
  const dir = contentType === 'book' ? BOOKS_DIR : NOTES_DIR;
  return `${dir}${contentId}.pdf`;
}

/**
 * Check if a book or note is already downloaded and the physical file exists.
 * Gracefully detects and purges stale SQLite records if the file was deleted.
 */
export async function checkOfflineAvailability(
  contentId: string,
  contentType: ContentType
): Promise<{ isAvailable: boolean; localPath: string | null; lastPage: number }> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    const lastPage = await getReadingPosition(contentId, contentType);
    return { isAvailable: false, localPath: null, lastPage };
  }

  const record = await getDownloadRecord(contentId, contentType);
  const targetPath = getLocalFilePath(contentId, contentType);

  try {
    const fileInfo = await FileSystem.getInfoAsync(targetPath);

    if (fileInfo.exists && (fileInfo as any).size > 0) {
      // Physical file exists!
      const lastPage = record?.last_opened_page || (await getReadingPosition(contentId, contentType));
      return { isAvailable: true, localPath: targetPath, lastPage };
    } else {
      // Physical file is missing — if SQLite had a record, it is stale!
      if (record) {
        console.log(`[OfflineCache] Stale record detected for ${contentType} ${contentId}. Cleaning up.`);
        await deleteDownloadRecord(contentId, contentType);
      }
      const lastPage = await getReadingPosition(contentId, contentType);
      return { isAvailable: false, localPath: null, lastPage };
    }
  } catch (err) {
    console.warn('Error checking offline availability:', err);
    return { isAvailable: false, localPath: null, lastPage: 1 };
  }
}

/**
 * Download a PDF to persistent local storage and register its metadata in SQLite.
 *
 * @param contentId ID of book or note
 * @param contentType 'book' | 'note'
 * @param title Title for display in offline manager
 * @param getSignedUrlFn Async callback that requests fresh short-lived signed URL from Express
 * @param onProgress Callback invoked with progress percentage (0 - 100)
 */
export async function downloadPdfForOffline(
  contentId: string,
  contentType: ContentType,
  title: string,
  getSignedUrlFn: () => Promise<string>,
  onProgress?: (progressPercent: number) => void
): Promise<string> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    throw new Error('Offline PDF downloads are available on mobile devices.');
  }

  await ensureDirectoriesExist();

  const localFilePath = getLocalFilePath(contentId, contentType);

  // 1. Check if already completely downloaded
  const existing = await FileSystem.getInfoAsync(localFilePath);
  if (existing.exists && (existing as any).size > 0) {
    // Ensure SQLite metadata is in sync
    await saveDownloadRecord({
      id: `${contentType}_${contentId}`,
      content_id: contentId,
      content_type: contentType,
      title,
      local_file_path: localFilePath,
      file_size: (existing as any).size || 0,
      downloaded_at: new Date().toISOString(),
    });
    if (onProgress) onProgress(100);
    return localFilePath;
  }

  // 2. Request short-lived signed URL from Express
  const signedUrl = await getSignedUrlFn();
  if (!signedUrl) {
    throw new Error('Failed to retrieve secure download URL.');
  }

  // 3. Initiate download with progress tracking
  const downloadResumable = FileSystem.createDownloadResumable(
    signedUrl,
    localFilePath,
    {},
    (progress) => {
      if (progress.totalBytesExpectedToWrite > 0 && onProgress) {
        const percent = Math.floor(
          (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100
        );
        onProgress(Math.min(100, Math.max(0, percent)));
      }
    }
  );

  const result = await downloadResumable.downloadAsync();
  if (!result || !result.uri) {
    throw new Error('Download did not complete successfully.');
  }

  // 4. Verify downloaded file
  const verifiedInfo = await FileSystem.getInfoAsync(localFilePath);
  if (!verifiedInfo.exists || (verifiedInfo as any).size === 0) {
    throw new Error('Downloaded file was empty or corrupted.');
  }

  const fileSize = (verifiedInfo as any).size || 0;
  const lastPage = await getReadingPosition(contentId, contentType);

  // 5. Save metadata into SQLite
  await saveDownloadRecord({
    id: `${contentType}_${contentId}`,
    content_id: contentId,
    content_type: contentType,
    title,
    local_file_path: localFilePath,
    file_size: fileSize,
    downloaded_at: new Date().toISOString(),
    last_opened_page: lastPage,
  });

  if (onProgress) onProgress(100);
  return localFilePath;
}

/**
 * Delete a downloaded PDF from local device storage and SQLite.
 * Does NOT touch server-side storage or database.
 */
export async function deleteLocalDownload(
  contentId: string,
  contentType: ContentType
): Promise<void> {
  const localFilePath = getLocalFilePath(contentId, contentType);

  try {
    const info = await FileSystem.getInfoAsync(localFilePath);
    if (info.exists) {
      await FileSystem.deleteAsync(localFilePath, { idempotent: true });
    }
  } catch (err) {
    console.warn('Error deleting physical file:', err);
  }

  // Remove from SQLite
  await deleteDownloadRecord(contentId, contentType);
}

/**
 * Scan all downloads, clean stale records, and calculate total storage used.
 */
export async function getStorageUsageReport(): Promise<{
  totalBytes: number;
  bookBytes: number;
  noteBytes: number;
  totalCount: number;
  books: DownloadRecord[];
  notes: DownloadRecord[];
}> {
  if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
    return {
      totalBytes: 0,
      bookBytes: 0,
      noteBytes: 0,
      totalCount: 0,
      books: [],
      notes: [],
    };
  }

  const allRecords = await getAllDownloadRecords();
  const validBooks: DownloadRecord[] = [];
  const validNotes: DownloadRecord[] = [];
  let bookBytes = 0;
  let noteBytes = 0;

  for (const item of allRecords) {
    try {
      const info = await FileSystem.getInfoAsync(item.local_file_path);
      if (info.exists && (info as any).size > 0) {
        const actualSize = (info as any).size;
        const validItem = { ...item, file_size: actualSize };
        if (item.content_type === 'book') {
          validBooks.push(validItem);
          bookBytes += actualSize;
        } else {
          validNotes.push(validItem);
          noteBytes += actualSize;
        }
      } else {
        // Clean stale record
        await deleteDownloadRecord(item.content_id, item.content_type);
      }
    } catch {
      await deleteDownloadRecord(item.content_id, item.content_type);
    }
  }

  return {
    totalBytes: bookBytes + noteBytes,
    bookBytes,
    noteBytes,
    totalCount: validBooks.length + validNotes.length,
    books: validBooks,
    notes: validNotes,
  };
}

/**
 * Formats byte size into human readable string (e.g. 14.2 MB)
 */
export function formatBytes(bytes: number, decimals: number = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
