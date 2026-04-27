import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, verifyAppJwt, UUID_RE } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!JWT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }

  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const sessionId: string = body?.session_id;
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return jsonResponse({ error: 'Invalid session_id' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: session, error: sErr } = await supabase
    .from('quest_sessions')
    .select('id, player_id, status')
    .eq('id', sessionId)
    .maybeSingle();
  if (sErr) return jsonResponse({ error: sErr.message }, 500);
  if (!session) return jsonResponse({ error: 'Сесията не съществува' }, 404);
  if (session.player_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (session.status === 'in_progress') {
    return jsonResponse({ error: 'Не можеш да изтриеш активна сесия. Първо я приключи.' }, 400);
  }

  // Best-effort cleanup of submissions (storage objects are kept; rows reference them).
  const { error: subErr } = await supabase
    .from('task_submissions')
    .delete()
    .eq('session_id', sessionId);
  if (subErr) return jsonResponse({ error: subErr.message }, 500);

  // Remove room player rows linked to this session (multiplayer cleanup).
  await supabase.from('room_players').delete().eq('session_id', sessionId);

  const { error: dErr } = await supabase
    .from('quest_sessions')
    .delete()
    .eq('id', sessionId);
  if (dErr) return jsonResponse({ error: dErr.message }, 500);

  return jsonResponse({ ok: true });
});
