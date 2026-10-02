import { supabaseAdmin } from '../lib/supabase';
import { Achievement, UserStats } from '../types';

export interface UnlockedAchievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
}

export async function checkAndUnlockAchievements(userId: string): Promise<UnlockedAchievement[]> {
  // 1. Fetch all reference achievements
  const { data: allAchievements, error: achError } = await supabaseAdmin
    .from('achievements')
    .select('*');

  if (achError || !allAchievements) {
    console.error('Failed to load achievements list:', achError?.message);
    return [];
  }

  // 2. Fetch already unlocked achievements for user
  const { data: userUnlocked, error: userAchError } = await supabaseAdmin
    .from('user_achievements')
    .select('achievement_id')
    .eq('user_id', userId);

  if (userAchError) {
    console.error('Failed to load user achievements:', userAchError.message);
    return [];
  }

  const unlockedIds = new Set((userUnlocked || []).map((u) => u.achievement_id));

  // 3. Gather stats and reading history
  const { data: statsData } = await supabaseAdmin
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const stats = (statsData || { current_streak: 0, longest_streak: 0, total_xp: 0 }) as UserStats;

  // Qualified sessions count
  const { count: qualifiedSessionsCount } = await supabaseAdmin
    .from('reading_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('qualified', true);

  // Unique books read (qualified)
  const { data: uniqueBooksData } = await supabaseAdmin
    .from('reading_sessions')
    .select('book_id')
    .eq('user_id', userId)
    .eq('qualified', true);

  const uniqueBooksCount = new Set((uniqueBooksData || []).map((s) => s.book_id)).size;

  const newlyUnlocked: UnlockedAchievement[] = [];

  for (const ach of allAchievements as Achievement[]) {
    if (unlockedIds.has(ach.id)) {
      continue;
    }

    let isMet = false;

    switch (ach.code) {
      case 'first_read':
        isMet = (qualifiedSessionsCount || 0) >= 1;
        break;
      case 'streak_3':
        isMet = stats.current_streak >= 3 || stats.longest_streak >= 3;
        break;
      case 'streak_7':
        isMet = stats.current_streak >= 7 || stats.longest_streak >= 7;
        break;
      case 'books_5':
        isMet = uniqueBooksCount >= 5;
        break;
      case 'books_10':
        isMet = uniqueBooksCount >= 10;
        break;
      case 'xp_1000':
        isMet = stats.total_xp >= 1000;
        break;
    }

    if (isMet) {
      const { error: insertError } = await supabaseAdmin
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: ach.id,
          earned_at: new Date().toISOString(),
        });

      if (!insertError) {
        newlyUnlocked.push({
          id: ach.id,
          code: ach.code,
          name: ach.name,
          description: ach.description,
          icon: ach.icon,
        });

        // Special milestone XP reward for 7-day streak (+100 XP)
        if (ach.code === 'streak_7') {
          await supabaseAdmin
            .from('user_stats')
            .update({
              total_xp: stats.total_xp + 100,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId);
        }
      } else {
        console.error(`Failed to record achievement unlock (${ach.code}):`, insertError.message);
      }
    }
  }

  return newlyUnlocked;
}
