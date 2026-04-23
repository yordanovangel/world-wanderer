import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { corsHeaders, jsonResponse, UUID_RE, verifyAppJwt } from '../_shared/auth.ts';
import { compareImages } from '../_shared/treasure-ai.ts';

const SUBMISSION_BUCKET = 'task-submissions';
const REFERENCE_BUCKET = 'task-references';
const SIGNED_TTL_SEC = 600;
const MATCH_CONFIDENCE_THRESHOLD = 0.7;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const JWT_SECRET = Deno.env.get('JWT_SECRET');
  if (!JWT_SECRET) return jsonResponse({ error: 'Server misconfigured' }, 500);
  const userId = await verifyAppJwt(req.headers.get('Authorization'), JWT_SECRET);
  if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  let body: any;
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON' }, 400); }
  const sessionId: string = body?.session_id;
  const taskId: string = body?.task_id;
  const submissionPath: string = body?.submission_path;

  if (
    !sessionId || !UUID_RE.test(sessionId) ||
    !taskId || !UUID_RE.test(taskId) ||
    typeof submissionPath !== 'string' ||
    !submissionPath.startsWith(`${sessionId}/${taskId}/`)
  ) {
    return jsonResponse({ error: 'Невалидни входни данни' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: session } = await supabase
    .from('quest_sessions')
    .select('id, quest_id, player_id, status, task_order')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return jsonResponse({ error: 'Сесията не съществува' }, 404);
  if (session.player_id !== userId) return jsonResponse({ error: 'Forbidden' }, 403);
  if (session.status !== 'in_progress') return jsonResponse({ error: 'Сесията не е активна' }, 409);

  const { data: task } = await supabase
    .from('quest_tasks')
    .select('id, quest_id, reference_image_path, order_idx')
    .eq('id', taskId)
    .maybeSingle();
  if (!task) return jsonResponse({ error: 'Задачата не съществува' }, 404);
  if (task.quest_id !== session.quest_id) return jsonResponse({ error: 'Forbidden' }, 403);
  if (!task.reference_image_path) {
    return jsonResponse({ error: 'Задачата няма референтна снимка' }, 400);
  }

  // Sequential check: load all tasks for this quest in player's order, find current task index.
  const { data: allTasks } = await supabase
    .from('quest_tasks')
    .select('id, order_idx')
    .eq('quest_id', session.quest_id);
  const orderedIds: string[] = Array.isArray(session.task_order) && session.task_order.length > 0
    ? (session.task_order as string[])
    : [...(allTasks ?? [])].sort((a: any, b: any) => a.order_idx - b.order_idx).map((t: any) => t.id);

  const myIndex = orderedIds.indexOf(taskId);
  if (myIndex === -1) {
    return jsonResponse({ error: 'Задачата не е в тази сесия' }, 400);
  }

  // Get all matched submissions (is_match=true) so far for this session
  const { data: prevSubs } = await supabase
    .from('task_submissions')
    .select('task_id, is_match')
    .eq('session_id', sessionId);
  const matchedTasks = new Set((prevSubs ?? []).filter((s: any) => s.is_match === true).map((s: any) => s.task_id));

  // All previous tasks in order must be matched
  for (let i = 0; i < myIndex; i++) {
    if (!matchedTasks.has(orderedIds[i])) {
      return jsonResponse({ error: 'Трябва да решиш предишните задачи първо' }, 409);
    }
  }
  // Already matched? Don't allow more
  if (matchedTasks.has(taskId)) {
    return jsonResponse({ error: 'Вече намери този обект' }, 409);
  }

  // Sign download URLs for both images
  const [refSigned, subSigned] = await Promise.all([
    supabase.storage.from(REFERENCE_BUCKET).createSignedUrl(task.reference_image_path, SIGNED_TTL_SEC),
    supabase.storage.from(SUBMISSION_BUCKET).createSignedUrl(submissionPath, SIGNED_TTL_SEC),
  ]);
  if (refSigned.error || !refSigned.data?.signedUrl) {
    console.error('sign ref', refSigned.error);
    return jsonResponse({ error: 'Не можахме да заредим референцията' }, 500);
  }
  if (subSigned.error || !subSigned.data?.signedUrl) {
    console.error('sign sub', subSigned.error);
    return jsonResponse({ error: 'Не можахме да заредим снимката' }, 500);
  }

  let result;
  try {
    result = await compareImages(refSigned.data.signedUrl, subSigned.data.signedUrl);
  } catch (e: any) {
    console.error('compare ai', e?.message, e?.body);
    if (e?.status === 429) return jsonResponse({ error: 'AI системата е заета.' }, 429);
    if (e?.status === 402) return jsonResponse({ error: 'Изчерпан AI кредит.' }, 402);
    return jsonResponse({ error: 'AI не успя да сравни снимките.' }, 502);
  }

  const accepted = result.match && result.confidence >= MATCH_CONFIDENCE_THRESHOLD && !result.fraud_suspected;

  const { count: existingAttempts } = await supabase
    .from('task_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('task_id', taskId);
  const attemptNo = (existingAttempts ?? 0) + 1;

  const { error: insErr } = await supabase.from('task_submissions').insert({
    session_id: sessionId,
    task_id: taskId,
    attempt_no: attemptNo,
    storage_path: submissionPath,
    is_match: accepted,
    match_confidence: result.confidence,
    ai_reasoning: result.user_hint,
    fraud_suspected: result.fraud_suspected,
    fraud_reason: result.fraud_reason,
    score: accepted ? 10 : 0,
  });
  if (insErr) {
    console.error('insert submission', insErr);
    return jsonResponse({ error: 'Не успяхме да запазим резултата' }, 500);
  }

  let sessionCompleted = false;
  if (accepted && myIndex === orderedIds.length - 1) {
    const { error: upErr } = await supabase
      .from('quest_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('status', 'in_progress');
    if (!upErr) sessionCompleted = true;
  }

  return jsonResponse({
    match: accepted,
    user_hint: result.user_hint,
    attempt_no: attemptNo,
    session_completed: sessionCompleted,
  });
});
