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
  if (session.status === 'abandoned') return jsonResponse({ ok: true, status: 'abandoned' });
  if (session.status !== 'in_progress') {
    return jsonResponse({ error: 'Сесията вече е приключена' }, 409);
  }

  const { error: uErr } = await supabase
    .from('quest_sessions')
    .update({ status: 'abandoned', completed_at: new Date().toISOString() })
    .eq('id', sessionId);
  if (uErr) return jsonResponse({ error: uErr.message }, 500);

  return jsonResponse({ ok: true, status: 'abandoned' });
});
