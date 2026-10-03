import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { generalLimiter, authLimiter } from './middleware/rateLimiter';
import { errorHandler, NotFoundError } from './lib/errors';

// Route imports
import authRoutes from './routes/auth.routes';
import booksRoutes from './routes/books.routes';
import readingRoutes from './routes/reading.routes';
import statsRoutes from './routes/stats.routes';
import achievementsRoutes from './routes/achievements.routes';
import bookmarksRoutes from './routes/bookmarks.routes';
import communityRoutes from './routes/community.routes';
import adminBooksRoutes from './routes/admin.books.routes';
import adminCategoriesRoutes from './routes/admin.categories.routes';
import adminAuditRoutes from './routes/admin.audit.routes';
import adminCommunityRoutes from './routes/admin.community.routes';

dotenv.config();

export const app = express();
const PORT = process.env.PORT || 4000;

// Security & basic middlewares
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Apply general rate limiter across all routes
app.use(generalLimiter);

// Health check endpoint (for Render / uptime monitors)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PAGEX API',
    timestamp: new Date().toISOString(),
  });
});

// Mount application routes
app.use('/auth', authLimiter, authRoutes);
app.use('/books', booksRoutes);
app.use('/reading', readingRoutes);
app.use('/stats', statsRoutes);
app.use('/achievements', achievementsRoutes);
app.use('/bookmarks', bookmarksRoutes);
app.use('/community-notes', communityRoutes);

// Mount admin routes
app.use('/admin/books', adminBooksRoutes);
app.use('/admin/categories', adminCategoriesRoutes);
app.use('/admin/community-notes', adminCommunityRoutes);
app.use('/admin', adminAuditRoutes);


// 404 Catch-all handler
app.use((req, res, next) => {
  next(new NotFoundError(`Endpoint ${req.method} ${req.path} not found`));
});

// Global Error Handler
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[PAGEX API] Server running smoothly on port ${PORT}`);
  });
}
