import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { uploadCommunityNoteFile } from '../middleware/upload';
import { validate } from '../middleware/validate';
import {
  listCommunityNotes,
  getCommunityNoteById,
  createCommunityNote,
  deleteCommunityNote,
} from '../services/community.service';
import { BadRequestError } from '../lib/errors';

const router = Router();

const listQuerySchema = z.object({
  subject: z.string().optional(),
  semester: z.string().optional(),
  unit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  my_notes: z.enum(['true', 'false']).transform((v) => v === 'true').optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});

const uploadBodySchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title cannot exceed 200 characters'),
  subject: z.string().min(1, 'Subject is required').max(100, 'Subject cannot exceed 100 characters'),
  description: z.string().max(2000).optional(),
  semester: z.string().max(50).optional(),
  unit: z.string().max(50).optional(),
});

// GET /community-notes - List notes (approved only for students; custom filters supported)
router.get(
  '/',
  authMiddleware,
  validate(listQuerySchema, 'query'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const params = req.query as unknown as z.infer<typeof listQuerySchema>;
      const result = await listCommunityNotes(params, user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// GET /community-notes/:id - Get note detail and signed PDF URL
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next) => {
    try {
      const noteId = req.params.id;
      const user = req.user!;
      const result = await getCommunityNoteById(noteId, user);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /community-notes - Upload a new community PDF note
router.post(
  '/',
  authMiddleware,
  uploadCommunityNoteFile,
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const file = req.file;

      if (!file) {
        throw new BadRequestError('PDF document file is required under field "pdf".');
      }

      // Validate textual body fields
      const parseResult = uploadBodySchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMessages = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        throw new BadRequestError(`Validation error: ${errorMessages}`);
      }

      const clientIp = req.ip || req.socket.remoteAddress;
      const note = await createCommunityNote(user, file, parseResult.data, clientIp);

      res.status(201).json({
        message: 'Note uploaded successfully and queued for review.',
        note,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /community-notes/:id - Delete own note (or admin delete)
router.delete(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next) => {
    try {
      const noteId = req.params.id;
      const user = req.user!;
      await deleteCommunityNote(noteId, user);
      res.json({ message: 'Community note deleted successfully.' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
