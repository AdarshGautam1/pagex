import { updateReadingStreak } from '../src/services/streak.service';
import { processReadingXp } from '../src/services/xp.service';
import { supabaseAdmin } from '../src/lib/supabase';

jest.mock('../src/lib/supabase', () => {
  const actual = jest.requireActual('../src/lib/supabase');
  return {
    ...actual,
    supabaseAdmin: {
      from: jest.fn(),
    },
  };
});

describe('Reading Gamification Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Streak Calculation Service', () => {
    it('sets streak to 1 if user has no prior activity', async () => {
      const mockStats = {
        user_id: 'u-1',
        current_streak: 0,
        longest_streak: 0,
        total_xp: 0,
        last_activity_date: null,
      };

      const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockStats, error: null }),
        update: updateMock,
      });

      const result = await updateReadingStreak('u-1', '2026-10-02');
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(1);
      expect(result.isNewDay).toBe(true);
    });

    it('does not increment streak if reading on the same calendar day', async () => {
      const mockStats = {
        user_id: 'u-1',
        current_streak: 4,
        longest_streak: 7,
        total_xp: 200,
        last_activity_date: '2026-10-02',
      };

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockStats, error: null }),
      });

      const result = await updateReadingStreak('u-1', '2026-10-02');
      expect(result.currentStreak).toBe(4);
      expect(result.longestStreak).toBe(7);
      expect(result.isNewDay).toBe(false);
    });

    it('increments streak by 1 if reading on consecutive day', async () => {
      const mockStats = {
        user_id: 'u-1',
        current_streak: 4,
        longest_streak: 7,
        total_xp: 200,
        last_activity_date: '2026-10-01',
      };

      const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockStats, error: null }),
        update: updateMock,
      });

      const result = await updateReadingStreak('u-1', '2026-10-02');
      expect(result.currentStreak).toBe(5);
      expect(result.isNewDay).toBe(true);
    });

    it('resets streak to 1 if gap of 2 or more days occurs', async () => {
      const mockStats = {
        user_id: 'u-1',
        current_streak: 8,
        longest_streak: 10,
        total_xp: 400,
        last_activity_date: '2026-09-20',
      };

      const updateMock = jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) });

      (supabaseAdmin.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockStats, error: null }),
        update: updateMock,
      });

      const result = await updateReadingStreak('u-1', '2026-10-02');
      expect(result.currentStreak).toBe(1);
      expect(result.longestStreak).toBe(10); // preserves longest
    });
  });

  describe('XP Award and Daily Activity Dedup Service', () => {
    it('awards +20 XP on first qualifying read of the day', async () => {
      const fromMock = jest.fn((table: string) => {
        if (table === 'daily_activities') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
            insert: jest.fn().mockResolvedValue({ error: null }),
          };
        }
        if (table === 'reading_sessions') {
          const eqMock = jest.fn();
          eqMock.mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 2, error: null }),
          });
          return {
            select: jest.fn().mockReturnValue({ eq: eqMock }),
          };
        }
        if (table === 'user_stats') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { total_xp: 100 }, error: null }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        return {};
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation(fromMock);

      const result = await processReadingXp('u-1', 350, '2026-10-02');
      expect(result.xpEarnedThisSession).toBe(20);
      expect(result.totalXp).toBe(120);
      expect(result.firstQualifyingToday).toBe(true);
    });

    it('does NOT award extra +20 XP on second qualifying read on same day', async () => {
      const existingDaily = {
        id: 'da-1',
        user_id: 'u-1',
        activity_date: '2026-10-02',
        reading_seconds: 320,
        xp_earned: 20,
      };

      const fromMock = jest.fn((table: string) => {
        if (table === 'daily_activities') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({ data: existingDaily, error: null }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        if (table === 'reading_sessions') {
          const eqMock = jest.fn();
          eqMock.mockReturnValue({
            eq: jest.fn().mockResolvedValue({ count: 3, error: null }),
          });
          return {
            select: jest.fn().mockReturnValue({ eq: eqMock }),
          };
        }
        if (table === 'user_stats') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: { total_xp: 120 }, error: null }),
            update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
          };
        }
        return {};
      });

      (supabaseAdmin.from as jest.Mock).mockImplementation(fromMock);

      const result = await processReadingXp('u-1', 400, '2026-10-02');
      expect(result.xpEarnedThisSession).toBe(0);
      expect(result.totalXp).toBe(120);
      expect(result.firstQualifyingToday).toBe(false);
    });
  });
});
