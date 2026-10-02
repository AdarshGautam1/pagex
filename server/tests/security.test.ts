import request from 'supertest';
import { app } from '../src/index';
import { supabaseAdmin } from '../src/lib/supabase';

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

describe('Security & Privilege Escalation Defenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('prevents students from escalating role to admin via profile update', async () => {
    const studentUser = { id: 'student-id-123', email: 'student@example.com' };
    const studentProfile = {
      id: 'student-id-123',
      username: 'student123',
      display_name: 'Student One',
      avatar_url: null,
      role: 'student',
    };

    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: studentUser },
      error: null,
    });

    const updateMock = jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { ...studentProfile, display_name: 'Updated Name' },
            error: null,
          }),
        }),
      }),
    });

    const fromMock = jest.fn((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: studentProfile, error: null }),
          update: updateMock,
        };
      }
      return {};
    });

    (supabaseAdmin.from as jest.Mock).mockImplementation(fromMock);

    // Send payload attempting to inject role: admin
    const res = await request(app)
      .patch('/auth/profile')
      .set('Authorization', 'Bearer valid-student-token')
      .send({
        display_name: 'Updated Name',
        role: 'admin', // Malicious field injection
      });

    expect(res.status).toBe(200);

    // Verify that the update call to profiles NEVER included role
    expect(updateMock).toHaveBeenCalled();
    const updateArgs = updateMock.mock.calls[0][0];
    expect(updateArgs).not.toHaveProperty('role');
    expect(updateArgs).toEqual({ display_name: 'Updated Name' });
  });

  it('blocks unauthenticated access to sensitive gamification & reading endpoints', async () => {
    // Reading start
    const resReading = await request(app)
      .post('/reading/start')
      .send({ book_id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' });
    expect(resReading.status).toBe(401);

    // Stats
    const resStats = await request(app).get('/stats/me');
    expect(resStats.status).toBe(401);

    // Bookmarks
    const resBookmarks = await request(app).get('/bookmarks');
    expect(resBookmarks.status).toBe(401);
  });

  it('strictly isolates student role from all admin routes', async () => {
    const studentUser = { id: 'student-id-999', email: 'hacker@example.com' };
    const studentProfile = {
      id: 'student-id-999',
      username: 'hacker',
      display_name: 'Curious Student',
      role: 'student',
    };

    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user: studentUser },
      error: null,
    });

    (supabaseAdmin.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: studentProfile, error: null }),
    });

    const routes = [
      { method: 'get', path: '/admin/stats' },
      { method: 'get', path: '/admin/audit' },
      { method: 'post', path: '/admin/categories' },
    ];

    for (const route of routes) {
      let reqSender = request(app)[route.method as 'get' | 'post'](route.path);
      reqSender = reqSender.set('Authorization', 'Bearer student-token');
      const res = await reqSender;
      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Admin role required');
    }
  });
});
