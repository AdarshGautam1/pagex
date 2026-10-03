import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from './supabase';


const DEFAULT_API_URL = 'https://pagex.onrender.com';

function getApiBaseUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
  const targetUrl = (envUrl || DEFAULT_API_URL).replace(/\/+$/, '');

  // If local dev environment is explicitly specified, auto-detect host machine IP
  if (targetUrl.includes('localhost') || targetUrl.includes('127.0.0.1')) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:4000`;
    }
    if (Platform.OS === 'android') {
      return 'http://10.0.2.2:4000';
    }
  }

  return targetUrl;
}

const API_BASE = getApiBaseUrl();

export class ApiError extends Error {
  public status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Pass local client date (YYYY-MM-DD) for accurate timezone-aware streak tracking
  headers['x-client-date'] = new Date().toLocaleDateString('en-CA');

  // If FormData, remove Content-Type so fetch generates the boundary correctly; otherwise application/json
  const isFormData =
    options?.body instanceof FormData ||
    (options?.body && typeof (options.body as any)?._parts !== 'undefined') ||
    (options?.body && typeof (options.body as any)?.append === 'function');

  if (isFormData) {
    delete headers['Content-Type'];
  } else {
    headers['Content-Type'] = 'application/json';
  }

  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ApiError(response.status, errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Auth & Profile
  getMe: () => request<{ user: any; stats: any }>('/auth/me'),
  updateProfile: (data: { display_name?: string; avatar_url?: string | null }) =>
    request<{ message: string; user: any }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Books
  getBooks: (params?: { q?: string; category_id?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.q) query.append('q', params.q);
    if (params?.category_id) query.append('category_id', params.category_id);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ books: any[]; total: number; page: number; totalPages: number }>(
      `/books${qs ? `?${qs}` : ''}`
    );
  },
  getBookDetail: (id: string) => request<{ book: any; user_progress: any }>(`/books/${id}`),

  // Reading Sessions
  startReading: (book_id: string) =>
    request<{ session_id: string; pdf_url: string; book_title: string }>('/reading/start', {
      method: 'POST',
      body: JSON.stringify({ book_id }),
    }),
  heartbeatReading: (session_id: string) =>
    request<{ ok: boolean; active_seconds: number }>('/reading/heartbeat', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),
  endReading: (session_id: string) =>
    request<{
      session_id: string;
      active_seconds: number;
      qualified: boolean;
      xp_awarded: number;
      current_streak: number;
      longest_streak: number;
      total_xp: number;
      unlocked_achievements: any[];
    }>('/reading/end', {
      method: 'POST',
      body: JSON.stringify({ session_id }),
    }),

  // Stats & Leaderboard
  checkIn: () =>
    request<{
      message: string;
      streak: { current: number; longest: number; isNewDay: boolean };
    }>('/stats/check-in', {
      method: 'POST',
    }),
  getMyStats: () =>
    request<{
      streak: { current: number; longest: number; lastActivityDate: string | null };
      xp: { total: number };
      reading: { totalSeconds: number; totalMinutes: number; booksRead: number; totalSessions: number };
      weeklyActivity: Array<{ activity_date: string; reading_seconds: number; xp_earned: number }>;
    }>('/stats/me'),
  getLeaderboard: () =>
    request<{
      leaderboard: Array<{ id: string; display_name: string; avatar_url: string | null; weekly_xp: number; rank: number }>;
      currentUser: { id: string; display_name: string; avatar_url: string | null; weekly_xp: number; rank: number };
      weekStartDate: string;
    }>('/stats/leaderboard'),

  // Achievements
  getAchievements: () => request<any[]>('/achievements'),
  getMyAchievements: () => request<any[]>('/achievements/mine'),

  // Bookmarks
  getBookmarks: () => request<any[]>('/bookmarks'),
  createBookmark: (data: { book_id: string; page_number: number; note?: string }) =>
    request<{ message: string; bookmark: any }>('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteBookmark: (id: string) =>
    request<{ message: string }>(`/bookmarks/${id}`, {
      method: 'DELETE',
    }),

  // Admin APIs
  getAdminStats: () =>
    request<{
      total_users: number;
      total_books: number;
      total_reading_sessions: number;
      active_readers_last_7_days: number;
    }>('/admin/stats'),
  getAdminAudit: (params?: { action?: string; entity_type?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.action) query.append('action', params.action);
    if (params?.entity_type) query.append('entity_type', params.entity_type);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ logs: any[]; total: number; page: number; totalPages: number }>(
      `/admin/audit${qs ? `?${qs}` : ''}`
    );
  },
  getAdminCategories: () =>
    request<{ categories: Array<{ id: string; name: string; description?: string }> }>('/admin/categories'),
  createAdminCategory: (data: { name: string; description?: string }) =>
    request<{ message: string; category: any }>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateAdminCategory: (id: string, data: { name?: string; description?: string }) =>
    request<{ message: string; category: any }>(`/admin/categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteAdminCategory: (id: string) =>
    request<{ message: string }>(`/admin/categories/${id}`, {
      method: 'DELETE',
    }),
  createAdminBook: (formData: FormData) =>
    request<{ message: string; book: any }>('/admin/books', {
      method: 'POST',
      body: formData,
    }),
  updateAdminBook: (id: string, data: any) =>
    request<{ message: string; book: any }>(`/admin/books/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteAdminBook: (id: string) =>
    request<{ message: string }>(`/admin/books/${id}`, {
      method: 'DELETE',
    }),

  // Community Notes (Students & Shared)
  getCommunityNotes: (params?: {
    subject?: string;
    semester?: string;
    unit?: string;
    search?: string;
    status?: string;
    my_notes?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.subject) query.append('subject', params.subject);
    if (params?.semester) query.append('semester', params.semester);
    if (params?.unit) query.append('unit', params.unit);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.my_notes !== undefined) query.append('my_notes', String(params.my_notes));
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ notes: any[]; total: number; page: number; totalPages: number }>(
      `/community-notes${qs ? `?${qs}` : ''}`
    );
  },
  getCommunityNoteDetail: (id: string) =>
    request<{ note: any; pdf_url: string }>(`/community-notes/${id}`),
  uploadCommunityNote: async (params: {
    fileUri: string;
    fileName: string;
    mimeType?: string;
    title: string;
    subject: string;
    description?: string;
    semester?: string;
    unit?: string;
  }) => {
    const mime = params.mimeType || 'application/pdf';
    const fileName = params.fileName || 'study-note.pdf';

    // Helper to read Blob as base64 string
    const blobToBase64 = (blob: Blob): Promise<string> =>
      new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

    // Strategy 1: Standard Modern FormData with Blob
    // This matches the app's book-form.tsx pattern and works seamlessly with standard fetch
    try {
      const fileRes = await fetch(params.fileUri);
      let blob = await fileRes.blob();
      if (!blob.type || blob.type === 'application/octet-stream') {
        blob = new Blob([blob], { type: mime });
      }

      let filePayload: any = blob;
      if (typeof File !== 'undefined') {
        try {
          filePayload = new File([blob], fileName, { type: mime });
        } catch {
          filePayload = blob;
        }
      }

      const formData = new FormData();
      formData.append('pdf', filePayload, fileName);
      formData.append('title', params.title);
      formData.append('subject', params.subject);
      if (params.description) formData.append('description', params.description);
      if (params.semester) formData.append('semester', params.semester);
      if (params.unit) formData.append('unit', params.unit);

      return await request<{ message: string; note: any }>('/community-notes', {
        method: 'POST',
        body: formData,
      });
    } catch (formDataErr: any) {
      console.warn('FormData upload error, attempting base64 fallback:', formDataErr?.message);

      // Strategy 2: Base64 JSON Fallback
      // Completely bypasses Android DocumentPicker scoped cache issues and FormDataPart incompatibilities
      let base64 = '';
      try {
        const fileRes = await fetch(params.fileUri);
        const blob = await fileRes.blob();
        base64 = await blobToBase64(blob);
      } catch (blobErr) {
        console.warn('Blob base64 read failed, trying FileSystem.readAsStringAsync:', blobErr);
        base64 = await FileSystem.readAsStringAsync(params.fileUri, {
          encoding: 'base64',
        });
      }

      return await request<{ message: string; note: any }>('/community-notes', {
        method: 'POST',
        body: JSON.stringify({
          title: params.title,
          subject: params.subject,
          description: params.description,
          semester: params.semester,
          unit: params.unit,
          file_name: fileName,
          pdf_base64: base64,
        }),
      });
    }
  },
  deleteCommunityNote: (id: string) =>
    request<{ message: string }>(`/community-notes/${id}`, {
      method: 'DELETE',
    }),


  // Admin Community Notes
  getAdminCommunityNotes: (params?: {
    status?: string;
    subject?: string;
    semester?: string;
    unit?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.subject) query.append('subject', params.subject);
    if (params?.semester) query.append('semester', params.semester);
    if (params?.unit) query.append('unit', params.unit);
    if (params?.search) query.append('search', params.search);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return request<{ notes: any[]; total: number; page: number; totalPages: number }>(
      `/admin/community-notes${qs ? `?${qs}` : ''}`
    );
  },
  approveAdminCommunityNote: (id: string) =>
    request<{ message: string; note: any }>(`/admin/community-notes/${id}/approve`, {
      method: 'PATCH',
    }),
  rejectAdminCommunityNote: (id: string) =>
    request<{ message: string; note: any }>(`/admin/community-notes/${id}/reject`, {
      method: 'PATCH',
    }),
  deleteAdminCommunityNote: (id: string) =>
    request<{ message: string }>(`/admin/community-notes/${id}`, {
      method: 'DELETE',
    }),
};

