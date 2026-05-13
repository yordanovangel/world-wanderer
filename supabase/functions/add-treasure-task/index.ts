import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, UUID_RE, verifyAppJwt, getUserLang, locFn } from '../_shared/auth.ts';
import { generateHint } from '../_shared/treasure-ai.ts';

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
  const referencePath: string = body?.reference_path;
  const creatorContext: string = (body?.creator_context ?? '').toString().trim();

  if (!questId || !UUID_RE.test(questId)) {
    return jsonResponse({ error: locFn(req, 'Невалиден quest_id', 'Invalid quest_id') }, 400);
  }
  if (typeof referencePath !== 'string' || referencePath.length === 0) {
    return jsonResponse({ error: locFn(req, 'Липсва референтна снимка', 'Reference photo is missing') }, 400);
  }
  if (creatorContext.length < 3) {
    return jsonResponse({ error: locFn(req, 'Опиши обекта (поне 3 символа)', 'Describe the object (at least 3 characters)') }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: quest } = await supabase
    .from('quests')
    .select('id, creator_id, mode, status')
    .eq('id', questId)
    .maybeSingle();
  if (!quest) return jsonResponse({ error: locFn(req, 'Quest не съществува', 'Quest doesn\'t exist') }, 404);
  if (quest.creator_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (quest.mode !== 'treasure_hunt' || quest.status !== 'draft') {
    return jsonResponse({ error: locFn(req, 'Quest-ът не е чернова', 'Quest is not a draft') }, 409);
  }

  // Cap at 10 tasks
  const { count: existingCount } = await supabase
    .from('quest_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('quest_id', questId);
  if ((existingCount ?? 0) >= 10) {
    return jsonResponse({ error: locFn(req, 'Имаш максимум 10 задачи', 'You have a maximum of 10 tasks') }, 409);
  }

  const lang = await getUserLang(supabase, userId);
  let hint: string;
  try {
    hint = await generateHint(creatorContext, { lang });
  } catch (e: any) {
    console.error('generate hint', e?.message, e?.body);
    if (e?.status === 429) return jsonResponse({ error: locFn(req, 'AI системата е заета.', 'AI is busy.') }, 429);
    if (e?.status === 402) return jsonResponse({ error: locFn(req, 'Изчерпан AI кредит.', 'AI credits exhausted.') }, 402);
    return jsonResponse({ error: locFn(req, 'AI не успя да генерира подсказка.', 'AI failed to generate a hint.') }, 502);
  }

  const orderIdx = (existingCount ?? 0) + 1;
  const { data: inserted, error: insErr } = await supabase
    .from('quest_tasks')
    .insert({
      quest_id: questId,
      order_idx: orderIdx,
      title: hint.slice(0, 50),
      description: hint,
      reference_image_path: referencePath,
      creator_context: creatorContext.slice(0, 500),
      regenerations_used: 0,
      max_points: 10,
    })
    .select('id, order_idx')
    .single();

  if (insErr || !inserted) {
    console.error('insert task', insErr);
    return jsonResponse({ error: locFn(req, 'Не успяхме да запазим задачата', 'Couldn\'t save the task') }, 500);
  }

  return jsonResponse({
    task_id: inserted.id,
    order_idx: inserted.order_idx,
    hint,
    regenerations_remaining: 3,
  });
});
