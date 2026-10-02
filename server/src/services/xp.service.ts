import { supabaseAdmin } from '../lib/supabase';
import { DailyActivity, UserStats } from '../types';

export interface XpAwardResult {
  xpEarnedThisSession: number;
  totalXp: number;
  firstQualifyingToday: boolean;
  firstBookBonus: boolean;
}

export async function processReadingXp(
  userId: string,
  sessionSeconds: number,
  todayDate: string
): Promise<XpAwardResult> {
  let xpToAdd = 0;
  let firstQualifyingToday = false;
  let firstBookBonus = false;

  // 1. Check existing daily activity for today
  const { data: existingDaily } = await supabaseAdmin
    .from('daily_activities')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_date', todayDate)
    .maybeSingle();

  const daily = existingDaily as DailyActivity | null;

  if (!daily) {
    // First activity recorded today
    xpToAdd += 20;
    firstQualifyingToday = true;

    await supabaseAdmin.from('daily_activities').insert({
      user_id: userId,
      activity_date: todayDate,
      reading_seconds: sessionSeconds,
      xp_earned: 20,
    });
  } else {
    // Activity exists today
    if (daily.xp_earned === 0) {
      xpToAdd += 20;
      firstQualifyingToday = true;
    }

    await supabaseAdmin
      .from('daily_activities')
      .update({
        reading_seconds: (daily.reading_seconds || 0) + sessionSeconds,
        xp_earned: (daily.xp_earned || 0) + (firstQualifyingToday ? 20 : 0),
      })
      .eq('id', daily.id);
  }

  // 2. Check first book ever bonus (+25 XP)
  // Check count of qualified reading sessions before this one
  const { count: priorQualifiedCount, error: countError } = await supabaseAdmin
    .from('reading_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('qualified', true);

  if (!countError && priorQualifiedCount === 1) {
    // Exactly 1 qualified session (the current one just marked qualified)
    xpToAdd += 25;
    firstBookBonus = true;
  }

  // 3. Update total XP in user_stats
  const { data: stats } = await supabaseAdmin
    .from('user_stats')
    .select('total_xp')
    .eq('user_id', userId)
    .single();

  const currentTotal = (stats as UserStats | null)?.total_xp || 0;
  const newTotalXp = currentTotal + xpToAdd;

  if (xpToAdd > 0) {
    await supabaseAdmin
      .from('user_stats')
      .update({
        total_xp: newTotalXp,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);
  }

  return {
    xpEarnedThisSession: xpToAdd,
    totalXp: newTotalXp,
    firstQualifyingToday,
    firstBookBonus,
  };
}
