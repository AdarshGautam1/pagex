import { Request } from 'express';

// ---- Authenticated request ----
export interface AuthenticatedUser {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: 'student' | 'admin';
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      accessToken?: string;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
  accessToken: string;
}

// ---- Database row types ----
export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role: 'student' | 'admin';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  description: string | null;
  category_id: string | null;
  cover_path: string | null;
  pdf_path: string | null;
  page_count: number;
  published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingSession {
  id: string;
  user_id: string;
  book_id: string;
  started_at: string;
  ended_at: string | null;
  last_heartbeat_at: string;
  active_seconds: number;
  qualified: boolean;
  created_at: string;
}

export interface DailyActivity {
  id: string;
  user_id: string;
  activity_date: string;
  reading_seconds: number;
  xp_earned: number;
  created_at: string;
}

export interface UserStats {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  total_xp: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  requirement_value: number;
  created_at: string;
}

export interface UserAchievement {
  user_id: string;
  achievement_id: string;
  earned_at: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  book_id: string;
  page_number: number;
  note: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

// ---- Leaderboard ----
export interface LeaderboardEntry {
  id: string;
  display_name: string;
  avatar_url: string | null;
  weekly_xp: number;
  rank: number;
}
