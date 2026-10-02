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

  if (error || !stats) {
    throw new Error(`Failed to fetch user stats for streak calculation: ${error?.message || 'Not found'}`);
  }

  const currentStats = stats as UserStats;
  let newCurrentStreak = currentStats.current_streak;
  let newLongestStreak = currentStats.longest_streak;
  let isNewDay = false;

  if (!currentStats.last_activity_date) {
    newCurrentStreak = 1;
    newLongestStreak = Math.max(1, newLongestStreak);
    isNewDay = true;
  } else if (currentStats.last_activity_date === todayDate) {
    // Already counted today
    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      isNewDay: false,
    };
  } else {
    const lastDate = new Date(currentStats.last_activity_date);
    const currentDate = new Date(todayDate);
    const diffTime = currentDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 1) {
      newCurrentStreak += 1;
    } else {
      // Streak broken
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
    throw new Error(`Failed to update user streak: ${updateError.message}`);
  }

  return {
    currentStreak: newCurrentStreak,
    longestStreak: newLongestStreak,
    isNewDay,
  };
}
