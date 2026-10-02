import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

// GET /achievements - List all available achievements
router.get('/', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const { data: achievements, error } = await supabaseAdmin
      .from('achievements')
      .select('*')
      .order('requirement_value', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch achievements: ${error.message}`);
    }

    res.json(achievements || []);
  } catch (err) {
    next(err);
  }
});

// GET /achievements/mine - List user's earned achievements
router.get('/mine', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const userId = user.id;

    const { data: earned, error } = await supabaseAdmin
      .from('user_achievements')
      .select('achievement_id, earned_at, achievements(*)')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch user achievements: ${error.message}`);
    }

    const formatted = (earned || []).map((item) => ({
      ...item.achievements,
      earned_at: item.earned_at,
    }));

    res.json(formatted);
  } catch (err) {
    next(err);
  }
});

export default router;
