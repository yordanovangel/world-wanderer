import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { setAppLanguage, currentLanguage, type AppLanguage } from '@/i18n';

const TOKEN_KEY = 'rq_auth_token';
const USER_KEY = 'rq_auth_user';

export type AuthUser = {
  id: string;
  nickname: string | null;
  language?: AppLanguage;
};

type RegisterPayload = {
  nickname?: string;
  img_a_id: string;
  img_b_id: string;
  pin: string;
};

type LoginPayload = {
  img_a_id: string;
  img_b_id: string;
  pin: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  register: (p: RegisterPayload) => Promise<void>;
  login: (p: LoginPayload) => Promise<void>;
  logout: () => void;
  setLanguage: (lng: AppLanguage) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function readStored(): { token: string | null; user: AuthUser | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const userRaw = localStorage.getItem(USER_KEY);
    const user = userRaw ? (JSON.parse(userRaw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = readStored();
    setToken(stored.token);
    setUser(stored.user);
    if (stored.user?.language) setAppLanguage(stored.user.language);
    setLoading(false);
  }, []);

  const persist = useCallback((tk: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tk);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(tk);
    setUser(u);
    if (u.language) setAppLanguage(u.language);
  }, []);

  const callFn = useCallback(async <T,>(name: 'register-user' | 'login' | 'update-user-language', body: unknown): Promise<T> => {
    const { data, error } = await supabase.functions.invoke(name, {
      body,
      headers: { 'X-Language': currentLanguage() },
    });
    if (error) {
      let message = error.message || 'Error';
      const ctx = (error as any).context;
      if (ctx && typeof ctx.json === 'function') {
        try {
          const j = await ctx.json();
          if (j?.error) message = j.error;
        } catch {
          /* ignore */
        }
      }
      throw new Error(message);
    }
    return data as T;
  }, []);

  const register = useCallback(
    async (p: RegisterPayload) => {
      const data = await callFn<{ token: string; user_id: string; nickname: string | null; language?: AppLanguage }>(
        'register-user',
        { ...p, language: currentLanguage() },
      );
      persist(data.token, { id: data.user_id, nickname: data.nickname, language: data.language ?? currentLanguage() });
    },
    [callFn, persist],
  );

  const login = useCallback(
    async (p: LoginPayload) => {
      const data = await callFn<{ token: string; user_id: string; nickname: string | null; language?: AppLanguage }>(
        'login',
        p,
      );
      persist(data.token, { id: data.user_id, nickname: data.nickname, language: data.language ?? currentLanguage() });
    },
    [callFn, persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const setLanguage = useCallback(async (lng: AppLanguage) => {
    setAppLanguage(lng);
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, language: lng };
      try { localStorage.setItem(USER_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    if (token) {
      try {
        await callFn('update-user-language', { language: lng });
      } catch (e) {
        console.warn('[auth] failed to persist language', e);
      }
    }
  }, [callFn, token]);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, register, login, logout, setLanguage }),
    [user, token, loading, register, login, logout, setLanguage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
