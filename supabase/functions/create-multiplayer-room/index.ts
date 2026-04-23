import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, UUID_RE, verifyAppJwt } from '../_shared/auth.ts';

/**
 * Create a multiplayer room for a freshly generated multiplayer quest and
 * auto-add the host as a player + create their session (with shuffled order).
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET || JWT_SECRET.length < 32) {
    return jsonResponse({ error: 'Server misconfigured' }, 500);
  }
  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }
  const questId: string = body?.quest_id;
  if (!questId || !UUID_RE.test(questId)) {
    return jsonResponse({ error: 'Невалиден quest_id' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: quest, error: qErr } = await supabase
    .from('quests')
    .select('id, mode, creator_id, time_limit_sec')
    .eq('id', questId)
    .maybeSingle();
  if (qErr) return jsonResponse({ error: 'Database error' }, 500);
  if (!quest) return jsonResponse({ error: 'Quest не съществува' }, 404);
  if (quest.mode !== 'multiplayer') return jsonResponse({ error: 'Този quest не е мултиплеър' }, 400);
  if (quest.creator_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);

  // Reuse existing lobby room if any
  const { data: existing } = await supabase
    .from('multiplayer_rooms')
    .select('id, status')
    .eq('quest_id', questId)
    .eq('host_id', userId)
    .in('status', ['lobby', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return jsonResponse({ room_id: existing.id, status: existing.status });
  }

  const { data: room, error: rErr } = await supabase
    .from('multiplayer_rooms')
    .insert({ quest_id: questId, host_id: userId, status: 'lobby' })
    .select('id')
    .single();
  if (rErr || !room) {
    console.error('create room', rErr);
    return jsonResponse({ error: 'Не успяхме да създадем стая' }, 500);
  }

  // Add host as first player + session
  const { data: tasks } = await supabase
    .from('quest_tasks')
    .select('id, order_idx')
    .eq('quest_id', questId)
    .order('order_idx', { ascending: true });
  const taskIds = (tasks ?? []).map((t: any) => t.id);
  const order = shuffleSeeded(taskIds, `${room.id}:${userId}`);

  const { data: session, error: sErr } = await supabase
    .from('quest_sessions')
    .insert({
      quest_id: questId,
      player_id: userId,
      status: 'in_progress',
      task_order: order,
    })
    .select('id')
    .single();
  if (sErr || !session) {
    console.error('create host session', sErr);
    return jsonResponse({ error: 'Не успяхме да създадем сесия' }, 500);
  }

  await supabase.from('room_players').insert({
    room_id: room.id,
    player_id: userId,
    session_id: session.id,
  });

  return jsonResponse({ room_id: room.id, status: 'lobby' });
});

// --- deterministic shuffle ---
async function hash(s: string): Promise<number> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  const view = new DataView(buf);
  return view.getUint32(0, false);
}
function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleSeeded<T>(arr: T[], seed: string): T[] {
  // crypto.subtle is async; use a synchronous fallback hash to keep this simple
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const rand = mulberry32(h >>> 0);
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
