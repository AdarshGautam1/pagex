-- ============================================================
-- PAGEX — Secure Gamified E-Library
-- Complete Database Schema (Production / Least-Privilege RLS)
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (linked to auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Books
CREATE TABLE books (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  cover_path TEXT,
  pdf_path TEXT,
  page_count INTEGER NOT NULL DEFAULT 0,
  published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reading Sessions
CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  active_seconds INTEGER NOT NULL DEFAULT 0,
  qualified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Daily Activities (unique per user per day)
CREATE TABLE daily_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  reading_seconds INTEGER NOT NULL DEFAULT 0,
  xp_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, activity_date)
);

-- User Stats (one row per user)
CREATE TABLE user_stats (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  total_xp INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Achievements (reference table)
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📖',
  requirement_value INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Achievements (junction table)
CREATE TABLE user_achievements (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, achievement_id)
);

-- Bookmarks
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL DEFAULT 1,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, book_id, page_number)
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Community Notes
CREATE TABLE community_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  semester TEXT,
  unit TEXT,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_books_category ON books(category_id);
CREATE INDEX idx_books_published ON books(published);
CREATE INDEX idx_books_created_at ON books(created_at DESC);
CREATE INDEX idx_reading_sessions_user ON reading_sessions(user_id);
CREATE INDEX idx_reading_sessions_book ON reading_sessions(book_id);
CREATE INDEX idx_reading_sessions_open ON reading_sessions(user_id) WHERE ended_at IS NULL;
CREATE INDEX idx_daily_activities_user_date ON daily_activities(user_id, activity_date);
CREATE INDEX idx_daily_activities_date ON daily_activities(activity_date);
CREATE INDEX idx_user_stats_xp ON user_stats(total_xp DESC);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_community_notes_user ON community_notes(user_id);
CREATE INDEX idx_community_notes_status ON community_notes(status);
CREATE INDEX idx_community_notes_subject ON community_notes(subject);
CREATE INDEX idx_community_notes_created_at ON community_notes(created_at DESC);


-- ============================================================
-- TRIGGER: Auto-create profile + user_stats on auth signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    'student'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    display_name = EXCLUDED.display_name;

  INSERT INTO public.user_stats (user_id, current_streak, longest_streak, total_xp)
  VALUES (NEW.id, 0, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- TRIGGER: Auto-update updated_at on books
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER books_updated_at
  BEFORE UPDATE ON books
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER community_notes_updated_at
  BEFORE UPDATE ON community_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Security model:
-- 1. Direct client INSERT/UPDATE/DELETE is BLOCKED on all tables.
-- 2. Sensitive tables (reading_sessions, daily_activities, user_stats,
--    user_achievements, audit_logs) permit NO client writes.
-- 3. Profile updates and bookmarks writes are strictly gated through Express
--    using the service-role client.
-- 4. Audit logs have NO client access (read/write managed via Express + service-role).
-- 5. Service-role bypasses RLS and handles all writes safely with server validation.
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_notes ENABLE ROW LEVEL SECURITY;


-- ---- Profiles ----
-- Authenticated users can read their own profile and basic public profile info for leaderboards.
-- No client UPDATE or INSERT policy: updates must go through Express server.
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Public profile info for leaderboard"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- ---- Categories ----
-- Authenticated users can view categories. Admin writes are performed through Express.
CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

-- ---- Books ----
-- Authenticated users can read published books; admins can also read unpublished books.
-- All book creation/updates are performed through Express using service-role.
CREATE POLICY "Authenticated users can read published books"
  ON books FOR SELECT
  TO authenticated
  USING (
    published = true OR EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ---- Reading Sessions (SENSITIVE) ----
-- Users can only read their own sessions. Session lifecycle (start, heartbeat, end)
-- is strictly executed through Express to prevent forged reading time.
CREATE POLICY "Users can read own sessions"
  ON reading_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---- Daily Activities (SENSITIVE) ----
-- Read-only for authenticated user. Writes exclusively through Express service-role.
CREATE POLICY "Users can read own activities"
  ON daily_activities FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---- User Stats (SENSITIVE) ----
-- User can read own stats, and all authenticated users can read for leaderboard display.
-- All XP and streak updates must go through Express service-role.
CREATE POLICY "Users can read own stats"
  ON user_stats FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "All authenticated users can read stats for leaderboard"
  ON user_stats FOR SELECT
  TO authenticated
  USING (true);

-- ---- Achievements ----
-- Reference list is readable by all authenticated users.
CREATE POLICY "Authenticated users can read achievements"
  ON achievements FOR SELECT
  TO authenticated
  USING (true);

-- ---- User Achievements (SENSITIVE) ----
-- Users can view their own unlocked achievements. Unlocks occur exclusively via Express.
CREATE POLICY "Users can read own achievements"
  ON user_achievements FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---- Bookmarks ----
-- Users can read their own bookmarks. Bookmark creation/deletion is routed through Express.
CREATE POLICY "Users can read own bookmarks"
  ON bookmarks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- ---- Community Notes ----
-- Authenticated users can read approved notes.
CREATE POLICY "Users can read approved community notes"
  ON community_notes FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Users can read their own uploaded notes (pending, approved, or rejected).
CREATE POLICY "Users can read own community notes"
  ON community_notes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can read all community notes across all statuses.
CREATE POLICY "Admins can read all community notes"
  ON community_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ---- Audit Logs (SENSITIVE) ----
-- NO client SELECT or INSERT policy. Admin reads and system writes are performed via Express service-role.


-- ============================================================
-- SEED DATA: Achievements
-- ============================================================

INSERT INTO achievements (code, name, description, icon, requirement_value) VALUES
  ('first_read',  'First Read',    'Complete your first reading session',  '📖', 1),
  ('streak_3',    'On a Roll',     'Maintain a 3-day reading streak',      '🔥', 3),
  ('streak_7',    'Bookworm',      'Maintain a 7-day reading streak',      '📚', 7),
  ('books_5',     'Explorer',      'Read 5 different books',               '🧭', 5),
  ('books_10',    'Scholar',       'Read 10 different books',              '🎓', 10),
  ('xp_1000',     'Thousand Club', 'Earn 1,000 total XP',                 '⭐', 1000)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- SEED DATA: Categories
-- ============================================================

INSERT INTO categories (name, description) VALUES
  ('Fiction',      'Novels, short stories, and imaginative prose'),
  ('Science',      'Scientific exploration and discovery'),
  ('History',      'Past events, civilizations, and historical analysis'),
  ('Technology',   'Computing, engineering, and digital innovation'),
  ('Philosophy',   'Fundamental questions about existence and knowledge'),
  ('Self-Help',    'Personal development and growth')
ON CONFLICT (name) DO NOTHING;
