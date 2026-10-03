import { PDFDocument } from 'pdf-lib';
import { supabaseAdmin, getSignedUrl } from '../lib/supabase';
import { CommunityNote, CommunityNoteStatus, AuthenticatedUser } from '../types';
import { BadRequestError, NotFoundError, ForbiddenError } from '../lib/errors';
import { logAuditEvent } from './audit.service';

const COMMUNITY_BUCKET = 'community-notes';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export interface CreateNoteInput {
  title: string;
  subject: string;
  description?: string;
  semester?: string;
  unit?: string;
}

export interface ListCommunityNotesParams {
  subject?: string;
  semester?: string;
  unit?: string;
  search?: string;
  status?: CommunityNoteStatus;
  my_notes?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Validates that a file buffer represents a legitimate, non-empty PDF document.
 */
export async function validatePdfBuffer(buffer: Buffer): Promise<void> {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestError('Uploaded file is empty.');
  }

  if (buffer.length > MAX_FILE_SIZE) {
    throw new BadRequestError('Uploaded PDF exceeds the maximum 50MB file size limit.');
  }

  // Magic byte check: '%PDF-' (0x25, 0x50, 0x44, 0x46, 0x2D)
  const header = buffer.subarray(0, 5).toString('ascii');
  if (!header.startsWith('%PDF-')) {
    throw new BadRequestError('Uploaded file does not have a valid PDF header (%PDF-).');
  }

  // Deep validation using pdf-lib
  try {
    await PDFDocument.load(buffer, { ignoreEncryption: true });
  } catch (err: any) {
    throw new BadRequestError(`Invalid or corrupted PDF file: ${err.message || 'Parse error'}`);
  }
}

/**
 * Sanitizes original filenames for safe storage and presentation.
 */
export function sanitizeFilename(filename: string): string {
  const base = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return base.slice(0, 100) || 'document.pdf';
}

/**
 * List community notes with pagination, search, and field filtering.
 * Students only see approved notes unless viewing their own uploads (my_notes=true).
 * Admins can filter by any status.
 */
export async function listCommunityNotes(
  params: ListCommunityNotesParams,
  user: AuthenticatedUser
) {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from('community_notes')
    .select('*, profiles:user_id (id, username, display_name, avatar_url)', { count: 'exact' });

  // Access control & status filtering
  if (params.my_notes) {
    // Student or admin explicitly viewing their own uploads
    query = query.eq('user_id', user.id);
    if (params.status) {
      query = query.eq('status', params.status);
    }
  } else if (user.role === 'admin') {
    // Admin can view all statuses; filter if requested
    if (params.status) {
      query = query.eq('status', params.status);
    }
  } else {
    // Normal students only see approved community notes
    query = query.eq('status', 'approved');
  }

  // Filter by subject
  if (params.subject && params.subject.trim()) {
    query = query.ilike('subject', `%${params.subject.trim()}%`);
  }

  // Filter by semester
  if (params.semester && params.semester.trim()) {
    query = query.eq('semester', params.semester.trim());
  }

  // Filter by unit
  if (params.unit && params.unit.trim()) {
    query = query.eq('unit', params.unit.trim());
  }

  // Free-text search over title & description
  if (params.search && params.search.trim()) {
    const term = params.search.trim();
    query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%,subject.ilike.%${term}%`);
  }

  const { data: notes, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(`Failed to query community notes: ${error.message}`);
  }

  return {
    notes: notes || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * Get details of a single community note and generate a short-lived signed URL for reading.
 */
export async function getCommunityNoteById(
  noteId: string,
  user: AuthenticatedUser
): Promise<{ note: CommunityNote; pdf_url: string }> {
  const { data: noteData, error: noteError } = await supabaseAdmin
    .from('community_notes')
    .select('*, profiles:user_id (id, username, display_name, avatar_url)')
    .eq('id', noteId)
    .single();

  if (noteError || !noteData) {
    throw new NotFoundError('Community note not found.');
  }

  const note = noteData as CommunityNote;

  // Authorization check
  const isOwner = note.user_id === user.id;
  const isAdmin = user.role === 'admin';
  const isApproved = note.status === 'approved';

  if (!isApproved && !isOwner && !isAdmin) {
    throw new ForbiddenError('This note is currently pending review or has been rejected.');
  }

  // Generate 1-hour short-lived signed storage URL
  const pdf_url = await getSignedUrl(COMMUNITY_BUCKET, note.storage_path, 3600);

  return { note, pdf_url };
}

/**
 * Upload a community note with server-side validation and secure storage in Supabase.
 */
export async function createCommunityNote(
  user: AuthenticatedUser,
  file: Express.Multer.File | undefined,
  input: CreateNoteInput,
  clientIp?: string
): Promise<CommunityNote> {
  if (!file) {
    throw new BadRequestError('PDF file is required.');
  }

  // 1. Rigorous PDF buffer validation
  await validatePdfBuffer(file.buffer);

  // 2. Validate metadata fields
  const title = input.title?.trim();
  const subject = input.subject?.trim();
  if (!title) {
    throw new BadRequestError('Note title is required.');
  }
  if (!subject) {
    throw new BadRequestError('Subject is required.');
  }

  const sanitizedOriginalName = sanitizeFilename(file.originalname);
  const noteId = crypto.randomUUID();
  const storagePath = `${user.id}/${noteId}.pdf`;

  // 3. Upload to private Supabase Storage bucket
  const { error: storageError } = await supabaseAdmin.storage
    .from(COMMUNITY_BUCKET)
    .upload(storagePath, file.buffer, {
      contentType: 'application/pdf',
      upsert: false,
    });

  if (storageError) {
    throw new Error(`Failed to upload file to storage: ${storageError.message}`);
  }

  // 4. Insert note metadata in PostgreSQL with 'pending' status
  const { data: newNote, error: dbError } = await supabaseAdmin
    .from('community_notes')
    .insert({
      id: noteId,
      user_id: user.id, // Strictly server-enforced, never client-forged
      title,
      description: input.description?.trim() || null,
      subject,
      semester: input.semester?.trim() || null,
      unit: input.unit?.trim() || null,
      storage_path: storagePath,
      file_name: sanitizedOriginalName,
      file_size: file.size || file.buffer.length,
      status: 'pending',
    })
    .select('*, profiles:user_id (id, username, display_name, avatar_url)')
    .single();

  if (dbError || !newNote) {
    // Attempt rollback of storage file
    await supabaseAdmin.storage.from(COMMUNITY_BUCKET).remove([storagePath]).catch(() => {});
    throw new Error(`Failed to save community note record: ${dbError?.message}`);
  }

  // 5. Audit log
  await logAuditEvent({
    userId: user.id,
    action: 'COMMUNITY_NOTE_UPLOADED',
    entityType: 'community_notes',
    entityId: noteId,
    metadata: {
      title,
      subject,
      file_size: file.size,
      storage_path: storagePath,
      ip: clientIp,
    },
  });

  return newNote as CommunityNote;
}

/**
 * Delete a community note. Students can delete their own notes; admins can delete any note.
 */
export async function deleteCommunityNote(
  noteId: string,
  user: AuthenticatedUser
): Promise<void> {
  const { data: note, error: fetchError } = await supabaseAdmin
    .from('community_notes')
    .select('id, user_id, storage_path, title')
    .eq('id', noteId)
    .single();

  if (fetchError || !note) {
    throw new NotFoundError('Community note not found.');
  }

  const isOwner = note.user_id === user.id;
  const isAdmin = user.role === 'admin';

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You do not have permission to delete this note.');
  }

  // 1. Delete physical PDF from storage bucket
  if (note.storage_path) {
    await supabaseAdmin.storage.from(COMMUNITY_BUCKET).remove([note.storage_path]).catch((err) => {
      console.warn('Storage file deletion warning:', err);
    });
  }

  // 2. Delete database row
  const { error: dbError } = await supabaseAdmin
    .from('community_notes')
    .delete()
    .eq('id', noteId);

  if (dbError) {
    throw new Error(`Failed to delete note from database: ${dbError.message}`);
  }

  // 3. Audit log
  await logAuditEvent({
    userId: user.id,
    action: 'COMMUNITY_NOTE_DELETED',
    entityType: 'community_notes',
    entityId: noteId,
    metadata: {
      deleted_by_role: user.role,
      title: note.title,
    },
  });
}

/**
 * Admin action to approve or reject a community note.
 */
export async function updateCommunityNoteStatus(
  noteId: string,
  newStatus: 'approved' | 'rejected',
  adminUser: AuthenticatedUser
): Promise<CommunityNote> {
  const { data: note, error: fetchError } = await supabaseAdmin
    .from('community_notes')
    .select('*')
    .eq('id', noteId)
    .single();

  if (fetchError || !note) {
    throw new NotFoundError('Community note not found.');
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('community_notes')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', noteId)
    .select('*, profiles:user_id (id, username, display_name, avatar_url)')
    .single();

  if (updateError || !updated) {
    throw new Error(`Failed to update note status: ${updateError?.message}`);
  }

  // Audit log
  await logAuditEvent({
    userId: adminUser.id,
    action: newStatus === 'approved' ? 'COMMUNITY_NOTE_APPROVED' : 'COMMUNITY_NOTE_REJECTED',
    entityType: 'community_notes',
    entityId: noteId,
    metadata: {
      previous_status: note.status,
      new_status: newStatus,
      admin_id: adminUser.id,
    },
  });

  return updated as CommunityNote;
}
