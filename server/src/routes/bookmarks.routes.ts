import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supabaseAdmin, getPublicUrl } from '../lib/supabase';
import { NotFoundError, ForbiddenError } from '../lib/errors';

const router = Router();

const createBookmarkSchema = z.object({
  book_id: z.string().uuid(),
  page_number: z.number().int().min(1),
  note: z.string().max(500).optional(),
});

// GET /bookmarks - Fetch user's saved bookmarks with book summary
router.get('/', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const userId = user.id;

    const { data: bookmarks, error } = await supabaseAdmin
      .from('bookmarks')
      .select('*, books(id, title, author, cover_path, page_count)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch bookmarks: ${error.message}`);
    }

    const bookmarksWithCovers = (bookmarks || []).map((b) => ({
      ...b,
      book: b.books
        ? {
            ...b.books,
            cover_url: b.books.cover_path
              ? getPublicUrl('covers', b.books.cover_path)
              : null,
          }
        : null,
    }));

    res.json(bookmarksWithCovers);
  } catch (err) {
    next(err);
  }
});

// POST /bookmarks - Create or update bookmark for a book and page
router.post(
  '/',
  authMiddleware,
  validate(createBookmarkSchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const userId = user.id;
      const { book_id, page_number, note } = req.body;

      // Upsert bookmark on user_id, book_id, page_number
      const { data: bookmark, error } = await supabaseAdmin
        .from('bookmarks')
        .upsert(
          {
            user_id: userId,
            book_id,
            page_number,
            note: note ? note.trim() : null,
          },
          { onConflict: 'user_id,book_id,page_number' }
        )
        .select('*')
        .single();

      if (error) {
        throw new Error(`Failed to save bookmark: ${error.message}`);
      }

      res.status(201).json({
        message: 'Bookmark saved successfully',
        bookmark,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /bookmarks/:id - Delete own bookmark
router.delete('/:id', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const userId = user.id;
    const bookmarkId = req.params.id;

    // Verify ownership
    const { data: existing, error: findError } = await supabaseAdmin
      .from('bookmarks')
      .select('user_id')
      .eq('id', bookmarkId)
      .single();

    if (findError || !existing) {
      throw new NotFoundError('Bookmark not found');
    }

    if (existing.user_id !== userId) {
      throw new ForbiddenError('You do not have permission to delete this bookmark');
    }

    const { error: deleteError } = await supabaseAdmin
      .from('bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (deleteError) {
      throw new Error(`Failed to delete bookmark: ${deleteError.message}`);
    }

    res.json({ message: 'Bookmark deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
