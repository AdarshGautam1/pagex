import { supabaseAdmin } from '../lib/supabase';
import { UserStats } from '../types';

export interface StreakUpdateResult {
  currentStreak: number;
  longestStreak: number;
  isNewDay: boolean;
}

export async function updateReadingStreak(userId: string, todayDate: string): Promise<StreakUpdateResult> {
  const { data: stats, error } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  let currentStats: UserStats;

  if (error || !stats) {
    // If stats don't exist yet for this user (e.g. admin or pre-trigger account), initialize them
    const newStats = {
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      total_xp: 0,
      last_activity_date: todayDate,
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await supabaseAdmin
      .from('user_stats')
      .upsert(newStats);

    if (upsertErr) {
      console.warn(`Could not initialize user stats for ${userId}:`, upsertErr.message);
    }

    return {
      currentStreak: 1,
      longestStreak: 1,
      isNewDay: true,
    };
  }

  currentStats = stats as UserStats;
  let newCurrentStreak = currentStats.current_streak || 0;
  let newLongestStreak = currentStats.longest_streak || 0;
  let isNewDay = false;

  if (!currentStats.last_activity_date) {
    newCurrentStreak = 1;
    newLongestStreak = Math.max(1, newLongestStreak);
    isNewDay = true;
  } else if (currentStats.last_activity_date === todayDate) {
    // Already counted today: ensure streak is at least 1 if active today
    if (newCurrentStreak === 0) {
      newCurrentStreak = 1;
      newLongestStreak = Math.max(1, newLongestStreak);
      await supabaseAdmin
        .from('user_stats')
        .update({
          current_streak: 1,
          longest_streak: newLongestStreak,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    }

    return {
      currentStreak: Math.max(1, newCurrentStreak),
      longestStreak: Math.max(1, newLongestStreak),
      isNewDay: false,
    };
  } else {
    const lastDate = new Date(currentStats.last_activity_date);
    const currentDate = new Date(todayDate);
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays <= 0) {
      // Clock skew or timezone boundary on same calendar day
      return {
        currentStreak: Math.max(1, newCurrentStreak),
        longestStreak: Math.max(1, newLongestStreak),
        isNewDay: false,
      };
    } else if (diffDays === 1) {
      newCurrentStreak = (newCurrentStreak <= 0 ? 1 : newCurrentStreak + 1);
    } else {
      // Streak broken: restart at 1
      newCurrentStreak = 1;
    }

    newLongestStreak = Math.max(newLongestStreak, newCurrentStreak);
    isNewDay = true;
  }

  const { error: updateError } = await supabaseAdmin
    .from('user_stats')
    .update({
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak,
      last_activity_date: todayDate,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (updateError) {
    console.warn(`Failed to update user streak: ${updateError.message}`);
  }

  // Also ensure a record in daily_activities so weekly calendar reflects activity
  try {
    await supabaseAdmin
      .from('daily_activities')
      .upsert(
        {
          user_id: userId,
          activity_date: todayDate,
          reading_seconds: 0,
          xp_earned: 0,
        },
        { onConflict: 'user_id,activity_date', ignoreDuplicates: true }
      );
  } catch (actErr) {
    // Non-blocking
  }

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    isNewDay,
  };
}
