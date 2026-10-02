import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// GET /stats/me - Comprehensive personal reading statistics
router.get('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const userId = user.id;

    // 1. Fetch user_stats
    const { data: statsData } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    const stats = statsData || {
      current_streak: 0,
      longest_streak: 0,
      total_xp: 0,
      last_activity_date: null,
    };

    // 2. Aggregate total reading seconds and unique books read
    const { data: sessions } = await supabaseAdmin
      .from('reading_sessions')
      .select('book_id, active_seconds, qualified')
      .eq('user_id', userId);

    const totalSeconds = (sessions || []).reduce((acc, s) => acc + (s.active_seconds || 0), 0);
    const completedBooksCount = new Set(
      (sessions || []).filter((s) => s.qualified).map((s) => s.book_id)
    ).size;

    // 3. Fetch past 7 days daily activities for weekly habit chart
    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);
    const startDateStr = sevenDaysAgo.toISOString().split('T')[0];

    const { data: weeklyActivities } = await supabaseAdmin
      .from('daily_activities')
      .select('activity_date, reading_seconds, xp_earned')
      .eq('user_id', userId)
      .gte('activity_date', startDateStr)
      .order('activity_date', { ascending: true });

    res.json({
      streak: {
        current: stats.current_streak,
        longest: stats.longest_streak,
        lastActivityDate: stats.last_activity_date,
      },
      xp: {
        total: stats.total_xp,
      },
      reading: {
        totalSeconds,
        totalMinutes: Math.round(totalSeconds / 60),
        booksRead: completedBooksCount,
        totalSessions: (sessions || []).length,
      },
      weeklyActivity: weeklyActivities || [],
    });
  } catch (err) {
    next(err);
  }
});

// GET /stats/leaderboard - Weekly XP leaderboard + current user's standing
router.get('/leaderboard', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const userId = user.id;

    // Calculate start of current week (Monday)
    const now = new Date();
    const day = now.getDay();
    const diff = (day === 0 ? -6 : 1) - day; // adjust when day is sunday
    const monday = new Date(now.setDate(now.getDate() + diff));
    const mondayStr = monday.toISOString().split('T')[0];

    // Fetch weekly activities aggregated by user
    const { data: weeklyData, error: actError } = await supabaseAdmin
      .from('daily_activities')
      .select('user_id, xp_earned')
      .gte('activity_date', mondayStr);

    if (actError) {
      throw new Error(`Failed to calculate leaderboard: ${actError.message}`);
    }

    // Sum XP per user
    const userXpMap = new Map<string, number>();
    for (const record of weeklyData || []) {
      const current = userXpMap.get(record.user_id) || 0;
      userXpMap.set(record.user_id, current + (record.xp_earned || 0));
    }

    // Also fetch all profiles so we have their names and avatars
    const { data: profiles, error: profError } = await supabaseAdmin
      .from('profiles')
      .select('id, display_name, avatar_url');

    if (profError) {
      throw new Error(`Failed to fetch profiles for leaderboard: ${profError.message}`);
    }

    // Build ranked list
    const rankedList = (profiles || [])
      .map((p) => ({
        id: p.id,
        display_name: p.display_name,
        avatar_url: p.avatar_url,
        weekly_xp: userXpMap.get(p.id) || 0,
      }))
      .sort((a, b) => b.weekly_xp - a.weekly_xp)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
      }));

    // Top 10 leaders
    const top10 = rankedList.slice(0, 10);

    // Current user's standing
    const currentUserStanding = rankedList.find((item) => item.id === userId) || {
      id: userId,
      display_name: user.display_name,
      avatar_url: user.avatar_url,
      weekly_xp: userXpMap.get(userId) || 0,
      rank: rankedList.length + 1,
    };

    res.json({
      leaderboard: top10,
      currentUser: currentUserStanding,
      weekStartDate: mondayStr,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
