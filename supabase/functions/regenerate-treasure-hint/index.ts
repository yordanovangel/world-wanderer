import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, UUID_RE, verifyAppJwt } from '../_shared/auth.ts';
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
  const taskId: string = body?.task_id;
  const newContext: string | undefined =
    typeof body?.creator_context === 'string' ? body.creator_context.trim() : undefined;

  if (!taskId || !UUID_RE.test(taskId)) {
    return jsonResponse({ error: 'Невалиден task_id' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: task } = await supabase
    .from('quest_tasks')
    .select('id, quest_id, creator_context, regenerations_used')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return jsonResponse({ error: 'Задачата не съществува' }, 404);

  const { data: quest } = await supabase
    .from('quests')
    .select('creator_id, status, mode')
    .eq('id', task.quest_id)
    .maybeSingle();
  if (!quest) return jsonResponse({ error: 'Quest не съществува' }, 404);
  if (quest.creator_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (quest.status !== 'draft') {
    return jsonResponse({ error: 'Quest-ът вече е публикуван' }, 409);
  }

  if ((task.regenerations_used ?? 0) >= 3) {
    return jsonResponse({ error: 'Няма повече опити за тази задача' }, 429);
  }

  const ctx = (newContext && newContext.length >= 3 ? newContext : task.creator_context) ?? '';
  if (ctx.length < 3) {
    return jsonResponse({ error: 'Липсва описание' }, 400);
  }

  let hint: string;
  try {
    hint = await generateHint(ctx, { temperature: 0.9 });
  } catch (e: any) {
    console.error('regenerate hint', e?.message, e?.body);
    if (e?.status === 429) return jsonResponse({ error: 'AI системата е заета.' }, 429);
    if (e?.status === 402) return jsonResponse({ error: 'Изчерпан AI кредит.' }, 402);
    return jsonResponse({ error: 'AI не успя да генерира подсказка.' }, 502);
  }

  const newCount = (task.regenerations_used ?? 0) + 1;
  const update: Record<string, unknown> = {
    title: hint.slice(0, 50),
    description: hint,
    regenerations_used: newCount,
  };
  if (newContext && newContext.length >= 3) update.creator_context = newContext.slice(0, 500);

  const { error: upErr } = await supabase
    .from('quest_tasks')
    .update(update)
    .eq('id', taskId);
  if (upErr) {
    console.error('update task', upErr);
    return jsonResponse({ error: 'Не успяхме да обновим задачата' }, 500);
  }

  return jsonResponse({ hint, regenerations_remaining: Math.max(0, 3 - newCount) });
});
