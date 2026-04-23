import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, verifyAppJwt } from '../_shared/auth.ts';

const LATE_JOIN_WINDOW_SEC = 60;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET) return jsonResponse({ error: 'Server misconfigured' }, 500);
  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const shareToken: string = body?.share_token;
  if (!shareToken || typeof shareToken !== 'string') {
    return jsonResponse({ error: 'Невалиден линк' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: quest } = await supabase
    .from('quests')
    .select('id, mode, status')
    .eq('share_token', shareToken)
    .maybeSingle();
  if (!quest) return jsonResponse({ error: 'Quest не съществува' }, 404);
  if (quest.status === 'archived') return jsonResponse({ error: 'Quest архивиран' }, 410);

  // SOLO / TREASURE: ensure session, redirect to play.
  if (quest.mode !== 'multiplayer') {
    const { data: existing } = await supabase
      .from('quest_sessions')
      .select('id, status')
      .eq('quest_id', quest.id)
      .eq('player_id', userId)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    let sessionId = existing?.id ?? null;
    if (!sessionId || existing?.status !== 'in_progress') {
      const { data: tasks } = await supabase
        .from('quest_tasks')
        .select('id, order_idx')
        .eq('quest_id', quest.id)
        .order('order_idx', { ascending: true });
      const taskOrder = (tasks ?? []).map((t: any) => t.id);
      const { data: created } = await supabase
        .from('quest_sessions')
        .insert({ quest_id: quest.id, player_id: userId, status: 'in_progress', task_order: taskOrder })
        .select('id')
        .single();
      sessionId = created?.id ?? null;
    }
    return jsonResponse({
      redirect: `/quest/${quest.id}/intro`,
      session_id: sessionId,
      mode: quest.mode,
    });
  }

  // MULTIPLAYER
  const { data: room } = await supabase
    .from('multiplayer_rooms')
    .select('id, status, started_at')
    .eq('quest_id', quest.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!room) return jsonResponse({ error: 'Няма активна стая' }, 404);
  if (room.status === 'cancelled' || room.status === 'finished') {
    return jsonResponse({ error: 'Играта приключи' }, 410);
  }

  // Already a player?
  const { data: rp } = await supabase
    .from('room_players')
    .select('session_id')
    .eq('room_id', room.id)
    .eq('player_id', userId)
    .maybeSingle();
  if (rp) {
    const redirect =
      room.status === 'in_progress'
        ? `/room/${room.id}/play`
        : `/room/${room.id}/lobby`;
    return jsonResponse({ redirect, session_id: rp.session_id, mode: 'multiplayer', room_id: room.id });
  }

  // Late join check
  if (room.status === 'in_progress' && room.started_at) {
    const elapsed = (Date.now() - new Date(room.started_at).getTime()) / 1000;
    if (elapsed > LATE_JOIN_WINDOW_SEC) {
      return jsonResponse({ error: 'Играта вече започна' }, 410);
    }
  }

  // Capacity
  const { count } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', room.id);
  if ((count ?? 0) >= 5) return jsonResponse({ error: 'Стаята е пълна' }, 409);

  const { data: tasks } = await supabase
    .from('quest_tasks')
    .select('id, order_idx')
    .eq('quest_id', quest.id)
    .order('order_idx', { ascending: true });
  const taskIds = (tasks ?? []).map((t: any) => t.id);
  const order = shuffleSeeded(taskIds, `${room.id}:${userId}`);

  const { data: created } = await supabase
    .from('quest_sessions')
    .insert({
      quest_id: quest.id,
      player_id: userId,
      status: 'in_progress',
      task_order: order,
    })
    .select('id')
    .single();
  if (!created) return jsonResponse({ error: 'Не успяхме да създадем сесия' }, 500);

  await supabase.from('room_players').insert({
    room_id: room.id,
    player_id: userId,
    session_id: created.id,
  });

  const redirect = room.status === 'in_progress'
    ? `/room/${room.id}/play`
    : `/room/${room.id}/lobby`;
  return jsonResponse({ redirect, session_id: created.id, mode: 'multiplayer', room_id: room.id });
});

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
