import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!url || !anonKey) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

export const supabase = createClient(url, anonKey, {
  auth: {
    // Reality Quest uses a custom auth scheme (image-pair + PIN), not Supabase Auth.
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});
