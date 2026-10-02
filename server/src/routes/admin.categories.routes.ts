import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { validate } from '../middleware/validate';
import { supabaseAdmin } from '../lib/supabase';
import { NotFoundError } from '../lib/errors';
import { logAuditEvent } from '../services/audit.service';

const router = Router();

router.use(authMiddleware);
router.use(adminMiddleware);

const categorySchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().max(255).optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(255).optional(),
});

// GET /admin/categories - List all categories
router.get('/', async (req: Request, res: Response, next) => {
  try {
    const { data: categories, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      throw new Error(`Failed to list categories: ${error.message}`);
    }

    res.json({ categories: categories || [] });
  } catch (err) {
    next(err);
  }
});

// POST /admin/categories - Create category
router.post(
  '/',
  validate(categorySchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const { name, description } = req.body;

      const { data: category, error } = await supabaseAdmin
        .from('categories')
        .insert({
          name: name.trim(),
          description: description ? description.trim() : null,
        })
        .select('*')
        .single();

      if (error || !category) {
        throw new Error(`Failed to create category: ${error?.message}`);
      }

      await logAuditEvent({
        userId: user.id,
        action: 'CATEGORY_CREATED',
        entityType: 'category',
        entityId: category.id,
        metadata: { name: category.name },
      });

      res.status(201).json({
        message: 'Category created successfully',
        category,
      });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /admin/categories/:id - Update category
router.patch(
  '/:id',
  validate(updateCategorySchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const categoryId = req.params.id;
      const { name, description } = req.body;

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name.trim();
      if (description !== undefined) updates.description = description.trim();

      const { data: updated, error } = await supabaseAdmin
        .from('categories')
        .update(updates)
        .eq('id', categoryId)
        .select('*')
        .single();

      if (error || !updated) {
        throw new NotFoundError('Category not found or failed to update');
      }

      await logAuditEvent({
        userId: user.id,
        action: 'CATEGORY_UPDATED',
        entityType: 'category',
        entityId: categoryId,
        metadata: updates,
      });

      res.json({
        message: 'Category updated successfully',
        category: updated,
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /admin/categories/:id - Delete category
router.delete('/:id', async (req: Request, res: Response, next) => {
  try {
    const user = req.user!;
    const categoryId = req.params.id;

    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      throw new Error(`Failed to delete category: ${error.message}`);
    }

    await logAuditEvent({
      userId: user.id,
      action: 'CATEGORY_DELETED',
      entityType: 'category',
      entityId: categoryId,
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
