import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse } from '../_shared/auth.ts';

// Public lookup: returns quest title/mode/status by share_token.
// Used on /join/:token before the user is authenticated, so we can show
// "След login ще влезеш в quest '<title>'" hint.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const token: string = body?.share_token;
  if (!token || typeof token !== 'string' || token.length < 4) {
    return jsonResponse({ error: 'Invalid token' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await supabase
    .from('quests')
    .select('id, title, mode, status')
    .eq('share_token', token)
    .maybeSingle();

  if (error) return jsonResponse({ error: error.message }, 500);
  if (!data) return jsonResponse({ error: 'not_found' }, 404);
  return jsonResponse({
    quest_id: data.id,
    title: data.title,
    mode: data.mode,
    status: data.status,
  });
});
