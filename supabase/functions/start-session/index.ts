import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { jwtVerify } from 'https://esm.sh/jose@5.9.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function verifyAppJwt(authHeader: string | null, secret: string): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * Start (or resume) a session for a quest.
 *
 * - If the player already has an in_progress session for this quest → return it.
 * - Else create one with a per-player random task_order (currently sequential
 *   for solo; multiplayer phase will plug in shuffling).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    return json({ error: 'Server misconfigured' }, 500);
  }

  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return json({ error: 'Unauthorized' }, 401);

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const questId: string = payload?.quest_id;
  if (!questId || !UUID_RE.test(questId)) {
    return json({ error: 'Невалиден quest_id' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: quest, error: qErr } = await supabase
    .from('quests')
    .select('id, mode')
    .eq('id', questId)
    .maybeSingle();
  if (qErr) {
    console.error('quest lookup', qErr);
    return json({ error: 'Database error' }, 500);
  }
  if (!quest) return json({ error: 'Quest не съществува' }, 404);

  // Reuse existing in-progress session if present
  const { data: existing, error: exErr } = await supabase
    .from('quest_sessions')
    .select('id, task_order')
    .eq('quest_id', questId)
    .eq('player_id', userId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (exErr) console.error('existing session', exErr);
  if (existing) {
    return json({ session_id: existing.id, resumed: true });
  }

  const { data: tasks, error: tErr } = await supabase
    .from('quest_tasks')
    .select('id, order_idx')
    .eq('quest_id', questId)
    .order('order_idx', { ascending: true });
  if (tErr) {
    console.error('tasks', tErr);
    return json({ error: 'Database error' }, 500);
  }
  if (!tasks || tasks.length === 0) {
    return json({ error: 'Quest-ът няма задачи' }, 400);
  }

  const taskOrder = tasks.map((t: any) => t.id);

  const { data: created, error: cErr } = await supabase
    .from('quest_sessions')
    .insert({
      quest_id: questId,
      player_id: userId,
      status: 'in_progress',
      task_order: taskOrder,
    })
    .select('id')
    .single();
  if (cErr || !created) {
    console.error('create session', cErr);
    return json({ error: 'Не успяхме да създадем сесия' }, 500);
  }

  return json({ session_id: created.id, resumed: false });
});
