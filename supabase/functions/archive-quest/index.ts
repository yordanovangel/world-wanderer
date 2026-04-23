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
  const questId: string = body?.quest_id;
  if (!questId || !UUID_RE.test(questId)) {
    return jsonResponse({ error: 'Invalid quest_id' }, 400);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const { data: quest, error: qErr } = await supabase
    .from('quests')
    .select('id, creator_id, status')
    .eq('id', questId)
    .maybeSingle();
  if (qErr) return jsonResponse({ error: qErr.message }, 500);
  if (!quest) return jsonResponse({ error: 'Quest не съществува' }, 404);
  if (quest.creator_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (quest.status === 'archived') return jsonResponse({ ok: true, status: 'archived' });

  const { error: uErr } = await supabase
    .from('quests')
    .update({ status: 'archived' })
    .eq('id', questId);
  if (uErr) return jsonResponse({ error: uErr.message }, 500);

  return jsonResponse({ ok: true, status: 'archived' });
});
