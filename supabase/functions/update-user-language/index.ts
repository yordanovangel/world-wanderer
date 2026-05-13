import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, verifyAppJwt, resolveLang, tErr } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return jsonResponse({ error: tErr('bg', 'method_not_allowed') }, 405);
  }

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const userId = await verifyAppJwt(req.headers.get('authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: tErr('bg', 'unauthorized') }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: tErr('bg', 'invalid_json') }, 400);
  }
  const lang = resolveLang(req, body);
  const target = body?.language;
  if (target !== 'bg' && target !== 'en') {
    return jsonResponse({ error: tErr(lang, 'invalid_input') }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { error } = await supabase
    .from('users')
    .update({ language: target })
    .eq('id', userId);
  if (error) {
    console.error('update language', error);
    return jsonResponse({ error: tErr(lang, 'db_error') }, 500);
  }
  return jsonResponse({ ok: true, language: target });
});
