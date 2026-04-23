import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

const TOKEN_KEY = 'rq_auth_token';
const USER_KEY = 'rq_auth_user';

export type AuthUser = {
  id: string;
  nickname: string | null;
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
    setLoading(false);
  }, []);

  const persist = useCallback((tk: string, u: AuthUser) => {
    localStorage.setItem(TOKEN_KEY, tk);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    setToken(tk);
    setUser(u);
  }, []);

  const callFn = useCallback(async <T,>(name: 'register-user' | 'login', body: unknown): Promise<T> => {
    const { data, error } = await supabase.functions.invoke(name, { body });
    if (error) {
      // Try to surface the function's JSON error message when possible
      let message = error.message || 'Грешка';
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
      const data = await callFn<{ token: string; user_id: string; nickname: string | null }>(
        'register-user',
        p,
      );
      persist(data.token, { id: data.user_id, nickname: data.nickname });
    },
    [callFn, persist],
  );

  const login = useCallback(
    async (p: LoginPayload) => {
      const data = await callFn<{ token: string; user_id: string; nickname: string | null }>(
        'login',
        p,
      );
      persist(data.token, { id: data.user_id, nickname: data.nickname });
    },
    [callFn, persist],
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, token, loading, register, login, logout }),
    [user, token, loading, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
