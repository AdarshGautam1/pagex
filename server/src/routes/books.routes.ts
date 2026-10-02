import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { supabaseAdmin, getPublicUrl } from '../lib/supabase';
import { NotFoundError } from '../lib/errors';

const router = Router();

const listBooksQuerySchema = z.object({
  q: z.string().optional(),
  category_id: z.string().uuid().optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default('1'),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default('20'),
});

// GET /books - List books (published only for students; all for admin)
router.get(
  '/',
  authMiddleware,
  validate(listBooksQuerySchema, 'query'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const { q, category_id, page, limit } = req.query as unknown as {
        q?: string;
        category_id?: string;
        page: number;
        limit: number;
      };

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabaseAdmin
        .from('books')
        .select('*, categories(id, name)', { count: 'exact' });

      // Non-admins only see published books
      if (user.role !== 'admin') {
        query = query.eq('published', true);
      }

      if (category_id) {
        query = query.eq('category_id', category_id);
      }

      if (q && q.trim()) {
        const search = q.trim();
        query = query.or(`title.ilike.%${search}%,author.ilike.%${search}%`);
      }

      const { data: books, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        throw new Error(`Failed to query books: ${error.message}`);
      }

      // Append cover public URLs
      const booksWithUrls = (books || []).map((book) => ({
        ...book,
        cover_url: book.cover_path ? getPublicUrl('covers', book.cover_path) : null,
      }));

      res.json({
        books: booksWithUrls,
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

// GET /books/:id - Get book details + user reading stats + bookmark
router.get(
  '/:id',
  authMiddleware,
  async (req: Request, res: Response, next) => {
    try {
      const bookId = req.params.id;
      const user = req.user!;
      const userId = user.id;

      // Fetch book
      let bookQuery = supabaseAdmin
        .from('books')
        .select('*, categories(id, name, description)')
        .eq('id', bookId);

      if (user.role !== 'admin') {
        bookQuery = bookQuery.eq('published', true);
      }

      const { data: book, error: bookError } = await bookQuery.single();

      if (bookError || !book) {
        throw new NotFoundError('Book not found or unavailable');
      }

      // Fetch user's bookmarks for this book
      const { data: bookmarks } = await supabaseAdmin
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .order('page_number', { ascending: true });

      // Fetch user's reading sessions count / total active seconds for this book
      const { data: sessions } = await supabaseAdmin
        .from('reading_sessions')
        .select('active_seconds, qualified')
        .eq('user_id', userId)
        .eq('book_id', bookId);

      const totalSecondsRead = (sessions || []).reduce(
        (sum, s) => sum + (s.active_seconds || 0),
        0
      );
      const isCompleted = (sessions || []).some((s) => s.qualified);

      res.json({
        book: {
          ...book,
          cover_url: book.cover_path ? getPublicUrl('covers', book.cover_path) : null,
        },
        user_progress: {
          total_seconds_read: totalSecondsRead,
          is_completed: isCompleted,
          bookmarks: bookmarks || [],
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
