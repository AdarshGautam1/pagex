import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  startReadingSession,
  recordReadingHeartbeat,
  endReadingSession,
} from '../services/reading.service';

const router = Router();

const startSessionSchema = z.object({
  book_id: z.string().uuid(),
});

const sessionActionSchema = z.object({
  session_id: z.string().uuid(),
});

// POST /reading/start - Start reading session and get signed PDF URL
router.post(
  '/start',
  authMiddleware,
  validate(startSessionSchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const { book_id } = req.body;
      const clientIp = req.ip || req.socket.remoteAddress;

      const result = await startReadingSession(
        user.id,
        book_id,
        user.role,
        clientIp
      );

      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /reading/heartbeat - Record heartbeat every ~30 seconds
router.post(
  '/heartbeat',
  authMiddleware,
  validate(sessionActionSchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const { session_id } = req.body;
      const result = await recordReadingHeartbeat(user.id, session_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

// POST /reading/end - End session, award XP/streaks and unlock achievements
router.post(
  '/end',
  authMiddleware,
  validate(sessionActionSchema, 'body'),
  async (req: Request, res: Response, next) => {
    try {
      const user = req.user!;
      const { session_id } = req.body;
      const result = await endReadingSession(user.id, session_id);
      res.json(result);
    } catch (err) {
      next(err);
    }
  }
);

export default router;
