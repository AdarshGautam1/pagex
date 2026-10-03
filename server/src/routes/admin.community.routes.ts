import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validate } from '../middleware/validate';
import {
  listCommunityNotes,
  updateCommunityNoteStatus,
  deleteCommunityNote,
} from '../services/community.service';

const router = Router();

// Protect all admin community routes with auth + admin checks
router.use(authMiddleware, adminMiddleware);

const adminListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  subject: z.string().optional(),
  semester: z.string().optional(),
  unit: z.string().optional(),
  search: z.string().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});

// GET /admin/community-notes - List notes for admin with any status filter
router.get(
  '/',
  validate(adminListQuerySchema, 'query'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const params = req.query as unknown as z.infer<typeof adminListQuerySchema>;
      const result = await listCommunityNotes(params, user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /admin/community-notes/:id/approve - Approve community note
router.patch(
  '/:id/approve',
  async (req: Request, res: Response, next) => {
    try {
      const noteId = req.params.id;
      const user = req.user!;
      const note = await updateCommunityNoteStatus(noteId, 'approved', user);
      res.json({
        message: 'Community note approved successfully.',
        note,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /admin/community-notes/:id/reject - Reject community note
router.patch(
  '/:id/reject',
  async (req: Request, res: Response, next) => {
    try {
      const noteId = req.params.id;
      const user = req.user!;
      const note = await updateCommunityNoteStatus(noteId, 'rejected', user);
      res.json({
        message: 'Community note rejected.',
        note,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /admin/community-notes/:id - Admin deletion of note
router.delete(
  '/:id',
  async (req: Request, res: Response, next) => {
    try {
      const noteId = req.params.id;
      const user = req.user!;
      await deleteCommunityNote(noteId, user);
      res.json({ message: 'Community note deleted by admin.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
