import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, UUID_RE, verifyAppJwt, locFn } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET) return jsonResponse({ error: 'Server misconfigured' }, 500);
  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const roomId: string = body?.room_id;
  if (!roomId || !UUID_RE.test(roomId)) return jsonResponse({ error: locFn(req, 'Невалиден room_id', 'Invalid room_id') }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: room } = await supabase
    .from('multiplayer_rooms')
    .select('id, host_id, status, quest_id')
    .eq('id', roomId)
    .maybeSingle();
  if (!room) return jsonResponse({ error: locFn(req, 'Стаята не съществува', 'Room doesn\'t exist') }, 404);
  if (room.host_id !== userId) return jsonResponse({ error: locFn(req, 'Само host-ът може да стартира', 'Only the host can start') }, 403);
  if (room.status !== 'lobby') return jsonResponse({ error: locFn(req, 'Стаята вече не е в lobby', 'Room is no longer in the lobby') }, 409);

  const { count: playerCount } = await supabase
    .from('room_players')
    .select('*', { count: 'exact', head: true })
    .eq('room_id', roomId);
  if ((playerCount ?? 0) < 2) return jsonResponse({ error: locFn(req, 'Нужни са поне 2 играчи', 'At least 2 players required') }, 400);

  const startedAt = new Date().toISOString();
  const { error: upErr } = await supabase
    .from('multiplayer_rooms')
    .update({ status: 'in_progress', started_at: startedAt })
    .eq('id', roomId)
    .eq('status', 'lobby');
  if (upErr) return jsonResponse({ error: locFn(req, 'Не успяхме да стартираме', 'Couldn\'t start') }, 500);

  return jsonResponse({ started_at: startedAt });
});
