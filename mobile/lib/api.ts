import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'nuzio.token';

export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const setToken = (t: string) => AsyncStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => AsyncStorage.removeItem(TOKEN_KEY);

export class ApiError extends Error {
  constructor(message: string, readonly status: number, readonly payload?: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status, body);
  }
  return body as T;
}

// ---- types -----------------------------------------------------------------

export interface User { id: string; email: string; name: string; avatarUrl: string | null }

export interface Preference {
  language: 'en' | 'hi';
  profession: string | null;
  niches: string[];
  voiceId: string;
  briefMinutes: number;
  deliveryTime: string;
  speed: number;
  autoAdvance: boolean;
  onboarded: boolean;
}

export interface BriefStory {
  id: string; order: number; title: string; summary: string;
  source: string; category: string; url: string | null; imageUrl: string | null;
  readMinutes: number; durationSec: number; played: boolean; publishedAt: string;
}

export interface Brief {
  id: string; date: string; greeting: string;
  storyCount: number; totalSeconds: number;
  voice: { id: string; name: string; speechLocale: string; pitch: number; rate: number };
  playback: { currentIndex: number; positionSec: number; completed: boolean };
  stories: BriefStory[];
}

export interface DeviceSpeechPlan {
  mode: 'device-speech';
  reason: string;
  script: string;
  voice: { id: string; locale: string; pitch: number; rate: number };
}

// ---- endpoints -------------------------------------------------------------

export const api = {
  health: () => request<{ ok: boolean; capabilities: Record<string, boolean> }>('/api/health'),

  loginWithGoogle: (idToken: string) =>
    request<{ token: string; user: User }>('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    }),

  loginDemo: () =>
    request<{ token: string; user: User; demo: boolean }>('/api/auth/demo', { method: 'POST' }),

  me: () => request<User & { preference: Preference | null }>('/api/me'),

  options: () => request<{
    niches: { id: string; label: string; emoji: string }[];
    professions: { id: string; label: string; emoji: string }[];
    voices: { id: string; name: string; initial: string; langLabel: string; descriptor: string }[];
  }>('/api/me/options'),

  updatePreferences: (patch: Partial<Omit<Preference, 'onboarded'>> & { onboarded?: boolean }) =>
    request<Preference>('/api/me/preferences', { method: 'PUT', body: JSON.stringify(patch) }),

  todaysBrief: (refresh = false) =>
    request<Brief>(`/api/brief/today${refresh ? '?refresh=true' : ''}`),

  saveProgress: (briefId: string, currentIndex: number, positionSec: number, completed?: boolean) =>
    request<{ currentIndex: number; positionSec: number; completed: boolean }>(
      `/api/brief/${briefId}/progress`,
      { method: 'POST', body: JSON.stringify({ currentIndex, positionSec, completed }) },
    ),

  /** Resolves to an MP3 url, or a device-speech plan when no TTS key is set. */
  narration: async (storyId: string, index: number, total: number, voiceId: string):
    Promise<{ kind: 'audio'; url: string } | { kind: 'speech'; plan: DeviceSpeechPlan }> => {
    const token = await getToken();
    const query = `index=${index}&total=${total}&voice=${encodeURIComponent(voiceId)}`;
    const url = `${BASE}/api/tts/story/${storyId}?${query}`;
    const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

    if (res.status === 409) return { kind: 'speech', plan: (await res.json()) as DeviceSpeechPlan };
    if (!res.ok) throw new ApiError('Narration unavailable', res.status);

    // The audio element/player fetches this URL itself and cannot attach an
    // Authorization header, so the session token rides in the query string.
    return {
      kind: 'audio',
      url: token ? `${url}&token=${encodeURIComponent(token)}` : url,
    };
  },

  discover: (category = 'all', q = '') =>
    request<{ categories: { id: string; label: string }[]; stories: BriefStory[] }>(
      `/api/stories?category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}`,
    ),

  toggleSave: (storyId: string) =>
    request<{ saved: boolean }>(`/api/stories/${storyId}/save`, { method: 'POST' }),
};

export const API_BASE = BASE;
