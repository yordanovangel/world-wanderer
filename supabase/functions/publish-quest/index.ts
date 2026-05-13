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
  const questId: string = body?.quest_id;
  if (!questId || !UUID_RE.test(questId)) {
    return jsonResponse({ error: locFn(req, 'Невалиден quest_id', 'Invalid quest_id') }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: quest } = await supabase
    .from('quests')
    .select('id, creator_id, mode, status, share_token')
    .eq('id', questId)
    .maybeSingle();
  if (!quest) return jsonResponse({ error: locFn(req, 'Quest не съществува', 'Quest doesn\'t exist') }, 404);
  if (quest.creator_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (quest.status !== 'draft') {
    return jsonResponse({ error: locFn(req, 'Quest-ът вече е публикуван', 'Quest is already published') }, 409);
  }

  const { count } = await supabase
    .from('quest_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('quest_id', questId);

  if (quest.mode === 'treasure_hunt' && (count ?? 0) !== 10) {
    return jsonResponse({ error: locFn(req, 'Трябват точно 10 задачи', 'Exactly 10 tasks are required') }, 400);
  }
  if ((count ?? 0) === 0) {
    return jsonResponse({ error: locFn(req, 'Quest-ът няма задачи', 'Quest has no tasks') }, 400);
  }

  const { error: upErr } = await supabase
    .from('quests')
    .update({ status: 'published' })
    .eq('id', questId);
  if (upErr) {
    console.error('publish', upErr);
    return jsonResponse({ error: locFn(req, 'Не успяхме да публикуваме', 'Couldn\'t publish') }, 500);
  }

  return jsonResponse({ quest_id: questId, share_token: quest.share_token });
});
