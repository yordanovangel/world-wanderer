import { supabase } from '@/integrations/supabase/client';
import { currentLanguage } from '@/i18n';

const TOKEN_KEY = 'rq_auth_token';

function authHeader(): Record<string, string> {
  const headers: Record<string, string> = { 'X-Language': currentLanguage() };
  if (typeof window === 'undefined') return headers;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Invoke an Edge Function with our custom JWT, surfacing the function's JSON error. */
export async function invokeFn<T = unknown>(
  name: string,
  body?: unknown,
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body,
    headers: authHeader(),
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
}
