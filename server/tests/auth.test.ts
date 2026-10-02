import request from 'supertest';
import { app } from '../src/index';
import { supabaseAdmin } from '../src/lib/supabase';

// Mock supabaseAdmin
jest.mock('../src/lib/supabase', () => {
  const actual = jest.requireActual('../src/lib/supabase');
  return {
    ...actual,
    supabaseAdmin: {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
    },
  };
});

describe('Authentication & Authorization Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects requests without Authorization header with 401', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing or malformed authorization token');
  });

  it('rejects requests with malformed Authorization header with 401', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Basic invalid-token');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Missing or malformed authorization token');
  });

  it('rejects invalid Supabase JWT with 401', async () => {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid JWT' },
    });

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid or expired authorization token');
  });

  it('allows authenticated student to access /auth/me', async () => {
    const mockUser = { id: 'u1-student-uuid', email: 'student@example.com' };
    const mockProfile = {
      id: 'u1-student-uuid',
      username: 'student1',
      display_name: 'Student One',
      avatar_url: null,
      role: 'student',
    };
    const mockStats = {
      user_id: 'u1-student-uuid',
      current_streak: 3,
      longest_streak: 5,
      total_xp: 120,
      last_activity_date: '2026-10-01',
    };

    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    const fromMock = jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
        };
      }
      if (table === 'user_stats') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: mockStats, error: null }),
        };
      }
      return {};
    });

    (supabaseAdmin.from as jest.Mock).mockImplementation(fromMock);

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer valid-student-token');

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.display_name).toBe('Student One');
    expect(res.body.stats.current_streak).toBe(3);
  });

  it('rejects student attempting to access admin route with 403 Forbidden', async () => {
    const mockUser = { id: 'u2-student-uuid', email: 'student2@example.com' };
    const mockProfile = {
      id: 'u2-student-uuid',
      username: 'student2',
      display_name: 'Student Two',
      role: 'student',
    };

    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValueOnce({
      data: { user: mockUser },
      error: null,
    });

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: mockProfile, error: null }),
    });

    const res = await request(app)
      .get('/admin/stats')
      .set('Authorization', 'Bearer student-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Admin role required');
  });
});
