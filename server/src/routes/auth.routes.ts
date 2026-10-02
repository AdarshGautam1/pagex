import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supabaseAdmin } from '../lib/supabase';
import { NotFoundError } from '../lib/errors';

const router = Router();

const updateProfileSchema = z.object({
  display_name: z.string().min(1).max(50).optional(),
  avatar_url: z.string().url().nullable().optional(),
});

// GET /auth/me - Fetch authenticated user profile and stats
router.get('/me', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const userId = user.id;

    // Fetch user stats
    const { data: stats, error: statsError } = await supabaseAdmin
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.warn('Error fetching user stats:', statsError.message);
    }

    res.json({
      user,
      stats: stats || {
        current_streak: 0,
        longest_streak: 0,
        total_xp: 0,
        last_activity_date: null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /auth/profile - Update display name or avatar (role changes are forbidden)
router.patch(
  '/profile',
  authMiddleware,
  validate(updateProfileSchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const userId = user.id;
      const { display_name, avatar_url } = req.body;

      const updates: Record<string, unknown> = {};
      if (display_name !== undefined) updates.display_name = display_name.trim();
      if (avatar_url !== undefined) updates.avatar_url = avatar_url;

      if (Object.keys(updates).length === 0) {
        res.json({ message: 'No changes provided', user });
        return;
      }

      const { data: updatedProfile, error } = await supabaseAdmin
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select('*')
        .single();

      if (error || !updatedProfile) {
        throw new NotFoundError('Failed to update profile');
      }

      res.json({
        message: 'Profile updated successfully',
        user: updatedProfile,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
