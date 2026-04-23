import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, UUID_RE, verifyAppJwt } from '../_shared/auth.ts';

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
  if (!roomId || !UUID_RE.test(roomId)) return jsonResponse({ error: 'Невалиден room_id' }, 400);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: room } = await supabase
    .from('multiplayer_rooms')
    .select('id, host_id, status')
    .eq('id', roomId)
    .maybeSingle();
  if (!room) return jsonResponse({ error: 'Стаята не съществува' }, 404);
  if (room.host_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (room.status === 'cancelled') return jsonResponse({ ok: true });

  const endedAt = new Date().toISOString();
  await supabase
    .from('multiplayer_rooms')
    .update({ status: 'cancelled', ended_at: endedAt })
    .eq('id', roomId);

  // Mark all sessions in this room as abandoned
  const { data: rps } = await supabase
    .from('room_players')
    .select('session_id')
    .eq('room_id', roomId);
  const sessionIds = (rps ?? []).map((r: any) => r.session_id).filter(Boolean);
  if (sessionIds.length > 0) {
    await supabase
      .from('quest_sessions')
      .update({ status: 'abandoned' })
      .in('id', sessionIds)
      .eq('status', 'in_progress');
  }

  return jsonResponse({ ok: true });
});
