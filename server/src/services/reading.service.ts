import { supabaseAdmin, getSignedUrl } from '../lib/supabase';
import { Book, ReadingSession, UserStats } from '../types';
import { BadRequestError, NotFoundError, ForbiddenError } from '../lib/errors';
import { logAuditEvent } from './audit.service';
import { updateReadingStreak } from './streak.service';
import { processReadingXp } from './xp.service';
import { checkAndUnlockAchievements, UnlockedAchievement } from './achievement.service';

export interface StartSessionResult {
  session_id: string;
  pdf_url: string;
  book_title: string;
}

export interface EndSessionResult {
  session_id: string;
  active_seconds: number;
  qualified: boolean;
  xp_awarded: number;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  unlocked_achievements: UnlockedAchievement[];
}

export async function startReadingSession(
  userId: string,
  bookId: string,
  userRole: string,
  clientIp?: string
): Promise<StartSessionResult> {
  // 1. Fetch book metadata
  const { data: bookData, error: bookError } = await supabaseAdmin
    .from('books')
    .select('*')
    .eq('id', bookId)
    .single();

  if (bookError || !bookData) {
    throw new NotFoundError('Book not found');
  }

  const book = bookData as Book;

  if (!book.published && userRole !== 'admin') {
    throw new ForbiddenError('Book is not published');
  }

  if (!book.pdf_path) {
    throw new BadRequestError('Book does not have an attached PDF file');
  }

  // 2. Close any lingering open sessions for this user
  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from('reading_sessions')
    .update({ ended_at: nowIso })
    .eq('user_id', userId)
    .is('ended_at', null);

  // 3. Create new reading session
  const { data: sessionData, error: sessionError } = await supabaseAdmin
    .from('reading_sessions')
    .insert({
      user_id: userId,
      book_id: bookId,
      started_at: nowIso,
      last_heartbeat_at: nowIso,
      active_seconds: 0,
      qualified: false,
    })
    .select('id')
    .single();

  if (sessionError || !sessionData) {
    throw new Error(`Failed to create reading session: ${sessionError?.message}`);
  }

  // 4. Generate short-lived signed URL for PDF (1 hour expiry)
  const signedPdfUrl = await getSignedUrl('pdfs', book.pdf_path, 3600);

  // 5. Audit log
  await logAuditEvent({
    userId,
    action: 'PDF_ACCESS',
    entityType: 'book',
    entityId: bookId,
    metadata: {
      session_id: sessionData.id,
      ip: clientIp || 'unknown',
    },
  });

  return {
    session_id: sessionData.id,
    pdf_url: signedPdfUrl,
    book_title: book.title,
  };
}

export async function recordReadingHeartbeat(
  userId: string,
  sessionId: string
): Promise<{ ok: boolean; active_seconds: number }> {
  // Fetch session
  const { data: sessionData, error } = await supabaseAdmin
    .from('reading_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !sessionData) {
    throw new NotFoundError('Reading session not found');
  }

  const session = sessionData as ReadingSession;

  if (session.user_id !== userId) {
    throw new ForbiddenError('Session does not belong to the user');
  }

  if (session.ended_at !== null) {
    throw new BadRequestError('Session has already ended');
  }

  const now = new Date();
  const lastHeartbeat = new Date(session.last_heartbeat_at);
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000));

  // Cap interval at 120 seconds to prevent drift/idle abuse
  const creditSeconds = Math.min(120, elapsedSeconds);
  const updatedActiveSeconds = (session.active_seconds || 0) + creditSeconds;

  const { error: updateError } = await supabaseAdmin
    .from('reading_sessions')
    .update({
      last_heartbeat_at: now.toISOString(),
      active_seconds: updatedActiveSeconds,
    })
    .eq('id', sessionId);

  if (updateError) {
    throw new Error(`Failed to record heartbeat: ${updateError.message}`);
  }

  return { ok: true, active_seconds: updatedActiveSeconds };
}

export async function endReadingSession(
  userId: string,
  sessionId: string
): Promise<EndSessionResult> {
  const { data: sessionData, error } = await supabaseAdmin
    .from('reading_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !sessionData) {
    throw new NotFoundError('Reading session not found');
  }

  const session = sessionData as ReadingSession;

  if (session.user_id !== userId) {
    throw new ForbiddenError('Session does not belong to the user');
  }

  if (session.ended_at !== null) {
    // Session was already ended; return current stats
    const { data: stats } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const currentStats = stats as UserStats;
    return {
      session_id: sessionId,
      active_seconds: session.active_seconds,
      qualified: session.qualified,
      xp_awarded: 0,
      current_streak: currentStats?.current_streak || 0,
      longest_streak: currentStats?.longest_streak || 0,
      total_xp: currentStats?.total_xp || 0,
      unlocked_achievements: [],
    };
  }

  const now = new Date();
  const lastHeartbeat = new Date(session.last_heartbeat_at);
  const finalElapsed = Math.max(0, Math.floor((now.getTime() - lastHeartbeat.getTime()) / 1000));
  const finalCredit = Math.min(120, finalElapsed);
  const totalActiveSeconds = (session.active_seconds || 0) + finalCredit;

  // 300 seconds (5 minutes) qualification threshold
  const qualified = totalActiveSeconds >= 300;

  // Mark session ended
  await supabaseAdmin
    .from('reading_sessions')
    .update({
      ended_at: now.toISOString(),
      active_seconds: totalActiveSeconds,
      qualified,
    })
    .eq('id', sessionId);

  let xpAwarded = 0;
  let unlockedAchievements: UnlockedAchievement[] = [];
  const todayDate = now.toISOString().split('T')[0];

  if (qualified) {
    // Process XP and daily activity
    const xpResult = await processReadingXp(userId, totalActiveSeconds, todayDate);
    xpAwarded = xpResult.xpEarnedThisSession;

    // Update streak
    await updateReadingStreak(userId, todayDate);

    // Check & unlock achievements
    unlockedAchievements = await checkAndUnlockAchievements(userId);
  }

  // Fetch updated user stats
  const { data: updatedStats } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const finalStats = updatedStats as UserStats;

  return {
    session_id: sessionId,
    active_seconds: totalActiveSeconds,
    qualified,
    xp_awarded: xpAwarded,
    current_streak: finalStats?.current_streak || 0,
    longest_streak: finalStats?.longest_streak || 0,
    total_xp: finalStats?.total_xp || 0,
    unlocked_achievements: unlockedAchievements,
  };
}
