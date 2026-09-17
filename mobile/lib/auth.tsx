import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, clearToken, setToken, type Preference, type User } from './api';

WebBrowser.maybeCompleteAuthSession();

const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '';
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? '';

export const googleConfigured = Boolean(WEB_CLIENT_ID || IOS_CLIENT_ID || ANDROID_CLIENT_ID);

const PLACEHOLDER_CLIENT_ID = '000000000000-placeholder.apps.googleusercontent.com';

interface AuthValue {
  user: (User & { preference: Preference | null }) | null;
  loading: boolean;
  error: string | null;
  googleReady: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthValue['user']>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // The hook throws if every client id is empty, so an inert placeholder keeps
  // it constructible. `googleConfigured` gates whether it is ever prompted.
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: WEB_CLIENT_ID || PLACEHOLDER_CLIENT_ID,
    iosClientId: IOS_CLIENT_ID || undefined,
    androidClientId: ANDROID_CLIENT_ID || undefined,
  });

  // Restore an existing session on launch.
  useEffect(() => {
    api.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  // Exchange the Google id_token for our own session token.
  useEffect(() => {
    if (response?.type !== 'success') return;
    const idToken = response.params?.id_token;
    if (!idToken) return;

    setLoading(true);
    api.loginWithGoogle(idToken)
      .then(async ({ token }) => {
        await setToken(token);
        setUser(await api.me());
        setError(null);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [response]);

  const value = useMemo<AuthValue>(() => ({
    user,
    loading,
    error,
    googleReady: googleConfigured && Boolean(request),

    signInWithGoogle: async () => {
      setError(null);
      if (!googleConfigured) {
        setError('Google sign-in is not configured yet - continuing as a guest.');
        return;
      }
      await promptAsync();
    },

    signInAsDemo: async () => {
      setError(null);
      setLoading(true);
      try {
        const { token } = await api.loginDemo();
        await setToken(token);
        setUser(await api.me());
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    },

    signOut: async () => {
      await clearToken();
      setUser(null);
    },

    refresh: async () => {
      try { setUser(await api.me()); } catch { /* keep current user */ }
    },
  }), [user, loading, error, request, promptAsync]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
