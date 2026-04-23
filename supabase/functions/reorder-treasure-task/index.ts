import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, UUID_RE, verifyAppJwt } from '../_shared/auth.ts';

/**
 * Reorder treasure tasks. Input: { quest_id, ordered_task_ids: string[] }.
 * Sets order_idx = index+1 for each task in the given order.
 * Uses two-pass update with a temporary offset to avoid unique-conflict on (quest_id, order_idx)
 * if such a constraint ever exists.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET) return jsonResponse({ error: 'Server misconfigured' }, 500);
  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }

  const questId: string = body?.quest_id;
  const ids: string[] = Array.isArray(body?.ordered_task_ids) ? body.ordered_task_ids : [];
  if (!questId || !UUID_RE.test(questId)) {
    return jsonResponse({ error: 'Невалиден quest_id' }, 400);
  }
  if (ids.length === 0 || ids.some((x) => typeof x !== 'string' || !UUID_RE.test(x))) {
    return jsonResponse({ error: 'Невалиден списък със задачи' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: quest } = await supabase
    .from('quests')
    .select('creator_id, status')
    .eq('id', questId)
    .maybeSingle();
  if (!quest) return jsonResponse({ error: 'Quest не съществува' }, 404);
  if (quest.creator_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (quest.status !== 'draft') {
    return jsonResponse({ error: 'Quest-ът вече е публикуван' }, 409);
  }

  const { data: tasks } = await supabase
    .from('quest_tasks')
    .select('id')
    .eq('quest_id', questId);
  const ownIds = new Set((tasks ?? []).map((t: any) => t.id));
  if (ids.length !== ownIds.size || ids.some((id) => !ownIds.has(id))) {
    return jsonResponse({ error: 'Списъкът не съвпада със задачите' }, 400);
  }

  // Two-pass to avoid potential unique conflicts.
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('quest_tasks').update({ order_idx: 1000 + i }).eq('id', ids[i]);
  }
  for (let i = 0; i < ids.length; i++) {
    await supabase.from('quest_tasks').update({ order_idx: i + 1 }).eq('id', ids[i]);
  }

  return jsonResponse({ ok: true });
});
