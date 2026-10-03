import request from 'supertest';
import { PDFDocument } from 'pdf-lib';
import { app } from '../src/index';
import { supabaseAdmin, getSignedUrl } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => {
  const actual = jest.requireActual('../src/lib/supabase');
  return {
    ...actual,
    supabaseAdmin: {
      auth: {
        getUser: jest.fn(),
      },
      from: jest.fn(),
      storage: {
        from: jest.fn(),
      },
    },
    getSignedUrl: jest.fn(),
  };
});

describe('Community Notes Feature Tests', () => {
  let validPdfBuffer: Buffer;

  const studentUser = { id: 'student-uuid-1', email: 'student1@pagex.edu' };
  const studentProfile = {
    id: 'student-uuid-1',
    username: 'student1',
    display_name: 'Student One',
    avatar_url: null,
    role: 'student',
  };

  const otherStudentUser = { id: 'student-uuid-2', email: 'student2@pagex.edu' };
  const otherStudentProfile = {
    id: 'student-uuid-2',
    username: 'student2',
    display_name: 'Student Two',
    avatar_url: null,
    role: 'student',
  };

  const adminUser = { id: 'admin-uuid-1', email: 'admin@pagex.edu' };
  const adminProfile = {
    id: 'admin-uuid-1',
    username: 'admin',
    display_name: 'Platform Admin',
    avatar_url: null,
    role: 'admin',
  };

  beforeAll(async () => {
    // Generate valid sample PDF using pdf-lib
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([400, 400]);
    page.drawText('PAGEX Community Note Test PDF');
    const bytes = await pdfDoc.save();
    validPdfBuffer = Buffer.from(bytes);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupAuth(user: any, profile: any) {
    (supabaseAdmin.auth.getUser as jest.Mock).mockResolvedValue({
      data: { user },
      error: null,
    });
    (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({ data: profile, error: null }),
        };
      }
      return {};
    });
  }

  describe('Upload & Validation', () => {
    it('rejects upload by anonymous/unauthenticated user', async () => {
      const res = await request(app)
        .post('/community-notes')
        .field('title', 'Math Notes')
        .field('subject', 'Calculus');

      expect(res.status).toBe(401);
    });

    it('rejects upload without PDF file', async () => {
      setupAuth(studentUser, studentProfile);

      const res = await request(app)
        .post('/community-notes')
        .set('Authorization', 'Bearer token')
        .field('title', 'Math Notes')
        .field('subject', 'Calculus');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/PDF document file is required/i);
    });

    it('rejects non-PDF files', async () => {
      setupAuth(studentUser, studentProfile);

      const res = await request(app)
        .post('/community-notes')
        .set('Authorization', 'Bearer token')
        .attach('pdf', Buffer.from('hello world plain text'), 'notes.txt')
        .field('title', 'Math Notes')
        .field('subject', 'Calculus');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid PDF document/i);
    });

    it('rejects file disguised as PDF without %PDF- magic bytes', async () => {
      setupAuth(studentUser, studentProfile);

      const fakePdf = Buffer.from('THIS IS NOT A REAL PDF');
      const res = await request(app)
        .post('/community-notes')
        .set('Authorization', 'Bearer token')
        .attach('pdf', fakePdf, 'fake.pdf')
        .field('title', 'Math Notes')
        .field('subject', 'Calculus');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/valid PDF header/i);
    });

    it('rejects upload with missing required title or subject', async () => {
      setupAuth(studentUser, studentProfile);

      const res = await request(app)
        .post('/community-notes')
        .set('Authorization', 'Bearer token')
        .attach('pdf', validPdfBuffer, 'notes.pdf')
        .field('title', ''); // empty title

      expect(res.status).toBe(400);
    });

    it('allows student to upload valid PDF note and defaults to pending status', async () => {
      setupAuth(studentUser, studentProfile);

      const uploadMock = jest.fn().mockResolvedValue({ data: {}, error: null });
      (supabaseAdmin.storage.from as jest.Mock).mockReturnValue({
        upload: uploadMock,
      });

      const insertedNote = {
        id: 'note-uuid-1',
        user_id: studentUser.id,
        title: 'Calculus Chapter 3 Notes',
        subject: 'Mathematics',
        status: 'pending',
        storage_path: `${studentUser.id}/note-uuid-1.pdf`,
        file_name: 'calculus.pdf',
        file_size: validPdfBuffer.length,
        created_at: new Date().toISOString(),
      };

      const insertMock = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: insertedNote, error: null }),
        }),
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: studentProfile, error: null }),
          };
        }
        if (table === 'community_notes') {
          return { insert: insertMock };
        }
        if (table === 'audit_logs') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const res = await request(app)
        .post('/community-notes')
        .set('Authorization', 'Bearer token')
        .attach('pdf', validPdfBuffer, 'calculus.pdf')
        .field('title', 'Calculus Chapter 3 Notes')
        .field('subject', 'Mathematics')
        .field('status', 'approved'); // Malicious attempt to self-approve!

      expect(res.status).toBe(201);
      expect(res.body.note.status).toBe('pending');

      // Verify that user_id in the DB insert was the authenticated user, NOT any client-supplied id
      const dbInsertArgs = insertMock.mock.calls[0][0];
      expect(dbInsertArgs.user_id).toBe(studentUser.id);
      expect(dbInsertArgs.status).toBe('pending'); // Enforced pending!
    });
  });

  describe('Authorization & Permissions', () => {
    it('blocks normal students from approving notes', async () => {
      setupAuth(studentUser, studentProfile);

      const res = await request(app)
        .patch('/admin/community-notes/note-uuid-1/approve')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
    });

    it('blocks normal students from rejecting notes', async () => {
      setupAuth(studentUser, studentProfile);

      const res = await request(app)
        .patch('/admin/community-notes/note-uuid-1/reject')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
    });

    it('prevents students from deleting another user notes', async () => {
      setupAuth(otherStudentUser, otherStudentProfile);

      const existingNote = {
        id: 'note-uuid-1',
        user_id: studentUser.id, // Owned by student 1!
        title: 'Student 1 Notes',
        storage_path: 'student-uuid-1/note-uuid-1.pdf',
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: otherStudentProfile, error: null }),
          };
        }
        if (table === 'community_notes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: existingNote, error: null }),
          };
        }
        return {};
      });

      const res = await request(app)
        .delete('/community-notes/note-uuid-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(403);
      expect(res.body.error).toMatch(/permission/i);
    });

    it('allows admins to approve notes', async () => {
      setupAuth(adminUser, adminProfile);

      const noteBefore = {
        id: 'note-uuid-1',
        user_id: studentUser.id,
        title: 'Physics Notes',
        status: 'pending',
      };

      const noteAfter = {
        ...noteBefore,
        status: 'approved',
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: adminProfile, error: null }),
          };
        }
        if (table === 'community_notes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: noteBefore, error: null }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({ data: noteAfter, error: null }),
                }),
              }),
            }),
          };
        }
        if (table === 'audit_logs') {
          return { insert: jest.fn().mockResolvedValue({ error: null }) };
        }
        return {};
      });

      const res = await request(app)
        .patch('/admin/community-notes/note-uuid-1/approve')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.note.status).toBe('approved');
    });

    it('generates short-lived signed URL for reading approved notes', async () => {
      setupAuth(studentUser, studentProfile);

      const approvedNote = {
        id: 'note-uuid-1',
        user_id: otherStudentUser.id,
        title: 'Approved Chemistry Guide',
        status: 'approved',
        storage_path: `${otherStudentUser.id}/note-uuid-1.pdf`,
      };

      (supabaseAdmin.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: studentProfile, error: null }),
          };
        }
        if (table === 'community_notes') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: approvedNote, error: null }),
          };
        }
        return {};
      });

      (getSignedUrl as jest.Mock).mockResolvedValue(
        'https://mock-supabase.co/storage/v1/object/sign/community-notes/note.pdf?token=xyz'
      );

      const res = await request(app)
        .get('/community-notes/note-uuid-1')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.pdf_url).toContain('token=xyz');
      expect(getSignedUrl).toHaveBeenCalledWith('community-notes', approvedNote.storage_path, 3600);
    });
  });
});
