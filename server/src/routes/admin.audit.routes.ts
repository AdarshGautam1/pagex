import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validate } from '../middleware/validate';
import { supabaseAdmin } from '../lib/supabase';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const auditQuerySchema = z.object({
  action: z.string().optional(),
  entity_type: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});

// GET /admin/stats - High-level platform metrics
router.get('/stats', async (req: Request, res: Response, next) => {
  try {
    const [
      { count: usersCount },
      { count: booksCount },
      { count: sessionsCount },
      { data: activeReadersData },
    ] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('books').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('reading_sessions').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('reading_sessions')
        .select('user_id')
        .gte(
          'started_at',
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        ),
    ]);

    const activeReadersCount = new Set((activeReadersData || []).map((r) => r.user_id)).size;

    res.json({
      total_users: usersCount || 0,
      total_books: booksCount || 0,
      total_reading_sessions: sessionsCount || 0,
      active_readers_last_7_days: activeReadersCount,
    });
  } catch (err) {
    next(err);
  }
});

// GET /admin/audit - Paginated audit logs with optional filters
router.get(
  '/audit',
  validate(auditQuerySchema, 'query'),
  async (req: Request, res: Response, next) => {
    try {
      const { action, entity_type, page, limit } = req.query as unknown as {
        action?: string;
        entity_type?: string;
        page: number;
        limit: number;
      };

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabaseAdmin
        .from('audit_logs')
        .select('*, profiles(id, username, display_name)', { count: 'exact' });

      if (action) {
        query = query.eq('action', action);
      }

      if (entity_type) {
        query = query.eq('entity_type', entity_type);
      }

      const { data: logs, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to fetch audit logs: ${error.message}`);
      }

      res.json({
        logs: logs || [],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
