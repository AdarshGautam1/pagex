import { Router, Request, Response } from 'express';
import { z } from 'zod';
import path from 'path';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { uploadBookFiles } from '../middleware/upload';
import { validate } from '../middleware/validate';
import { supabaseAdmin, getPublicUrl } from '../lib/supabase';
import { BadRequestError, NotFoundError } from '../lib/errors';
import { logAuditEvent } from '../services/audit.service';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const updateBookSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  author: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  category_id: z.string().uuid().nullable().optional(),
  page_count: z.number().int().min(1).optional(),
  published: z.boolean().optional(),
});

// POST /admin/books - Create new book with cover and PDF files
router.post('/', uploadBookFiles, async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const coverFile = files?.['cover']?.[0];
    const pdfFile = files?.['pdf']?.[0];

    const { title, author, description, category_id, page_count, published } = req.body;

    if (!title || !author) {
      throw new BadRequestError('Book title and author are required');
    }

    if (!pdfFile) {
      throw new BadRequestError('Book PDF file is required');
    }

    const timestamp = Date.now();
    const sanitizedTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 30);

    // 1. Upload Cover to 'covers' public bucket if provided
    let coverPath: string | null = null;
    let coverBuffer: Buffer | null = null;
    let coverMimetype = 'image/jpeg';
    let coverOriginalname = 'cover.jpg';

    if (coverFile) {
      coverBuffer = coverFile.buffer;
      coverMimetype = coverFile.mimetype || 'image/jpeg';
      coverOriginalname = coverFile.originalname;
    } else if (req.body.cover_base64) {
      coverBuffer = Buffer.from(req.body.cover_base64, 'base64');
      coverMimetype = req.body.cover_mimetype || 'image/jpeg';
      coverOriginalname = req.body.cover_filename || 'cover.jpg';
    }

    if (coverBuffer) {
      if (coverBuffer.length < 100) {
        throw new BadRequestError('Cover image file is empty or corrupted');
      }
      const coverExt =
        path.extname(coverOriginalname) ||
        (coverMimetype?.includes('png') ? '.png' : '.jpg');
      coverPath = `covers/${timestamp}-${sanitizedTitle}${coverExt}`;

      const { error: coverUploadError } = await supabaseAdmin.storage
        .from('covers')
        .upload(coverPath, coverBuffer, {
          contentType: coverMimetype,
          upsert: false,
        });

      if (coverUploadError) {
        throw new Error(`Failed to upload cover image: ${coverUploadError.message}`);
      }
    }

    // 2. Upload PDF to 'pdfs' private bucket
    const pdfExt = path.extname(pdfFile.originalname) || '.pdf';
    const pdfPath = `books/${timestamp}-${sanitizedTitle}${pdfExt}`;

    const { error: pdfUploadError } = await supabaseAdmin.storage
      .from('pdfs')
      .upload(pdfPath, pdfFile.buffer, {
        contentType: pdfFile.mimetype || 'application/pdf',
        upsert: false,
      });

    if (pdfUploadError) {
      if (coverPath) {
        await supabaseAdmin.storage.from('covers').remove([coverPath]);
      }
      throw new Error(`Failed to upload PDF: ${pdfUploadError.message}`);
    }

    // 3. Insert Book Record into Database
    const cleanCategoryId =
      category_id && category_id !== '' && category_id !== 'null' && category_id !== 'undefined'
        ? String(category_id).trim()
        : null;

    const { data: book, error: insertError } = await supabaseAdmin
      .from('books')
      .insert({
        title: title.trim(),
        author: author.trim(),
        description: description ? description.trim() : null,
        category_id: cleanCategoryId,
        page_count: page_count ? (parseInt(page_count, 10) || 1) : 1,
        published: published === 'true' || published === true,
        cover_path: coverPath,
        pdf_path: pdfPath,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (insertError || !book) {
      if (coverPath) await supabaseAdmin.storage.from('covers').remove([coverPath]);
      await supabaseAdmin.storage.from('pdfs').remove([pdfPath]);
      throw new Error(`Failed to insert book: ${insertError?.message}`);
    }

    // 4. Audit Log
    await logAuditEvent({
      userId: user.id,
      action: 'BOOK_CREATED',
      entityType: 'book',
      entityId: book.id,
      metadata: { title: book.title, author: book.author },
    });

    res.status(201).json({
      message: 'Book created successfully',
      book: {
        ...book,
        cover_url: book.cover_path ? getPublicUrl('covers', book.cover_path) : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /admin/books/:id - Update book metadata or publish toggle
router.patch(
  '/:id',
  validate(updateBookSchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const bookId = req.params.id;
      const updates = req.body;

      const { data: updatedBook, error } = await supabaseAdmin
        .from('books')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId)
        .select('*')
        .single();

      if (error || !updatedBook) {
        throw new NotFoundError('Book not found or failed to update');
      }

      await logAuditEvent({
        userId: user.id,
        action: 'BOOK_UPDATED',
        entityType: 'book',
        entityId: bookId,
        metadata: updates,
      });

      res.json({
        message: 'Book updated successfully',
        book: {
          ...updatedBook,
          cover_url: updatedBook.cover_path
            ? getPublicUrl('covers', updatedBook.cover_path)
            : null,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /admin/books/:id - Delete book and associated storage files
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const bookId = req.params.id;

    // Fetch existing book to retrieve file paths
    const { data: book, error: findError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single();

    if (findError || !book) {
      throw new NotFoundError('Book not found');
    }

    // Delete DB record
    const { error: deleteError } = await supabaseAdmin
      .from('books')
      .delete()
      .eq('id', bookId);

    if (deleteError) {
      throw new Error(`Failed to delete book: ${deleteError.message}`);
    }

    // Delete files from storage
    if (book.cover_path) {
      await supabaseAdmin.storage.from('covers').remove([book.cover_path]);
    }
    if (book.pdf_path) {
      await supabaseAdmin.storage.from('pdfs').remove([book.pdf_path]);
    }

    await logAuditEvent({
      userId: user.id,
      action: 'BOOK_DELETED',
      entityType: 'book',
      entityId: bookId,
      metadata: { title: book.title },
    });

    res.json({ message: 'Book and associated files deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
