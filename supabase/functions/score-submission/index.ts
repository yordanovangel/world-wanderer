import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { jwtVerify } from 'https://esm.sh/jose@5.9.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SUBMISSION_BUCKET = 'task-submissions';
const SIGNED_TTL_SEC = 600;
const MAX_ATTEMPTS = 2;
const AI_MODEL = 'google/gemini-2.5-pro';
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

const SCORE_TOOL = {
  type: 'function',
  function: {
    name: 'score_photo',
    description: 'Score the submitted photo against the hidden criteria.',
    parameters: {
      type: 'object',
      properties: {
        score: { type: 'integer', minimum: 0, maximum: 10 },
        reasoning: {
          type: 'string',
          description: 'One short sentence in Bulgarian for the user',
        },
        suspected_fraud: {
          type: 'boolean',
          description: 'True if the photo looks like a screenshot or downloaded image',
        },
      },
      required: ['score', 'reasoning', 'suspected_fraud'],
      additionalProperties: false,
    },
  },
} as const;

type ScoreResult = {
  score: number;
  reasoning: string;
  suspected_fraud: boolean;
};

function buildSystemPrompt(taskDescription: string, hiddenCriteria: string): string {
  return `You are evaluating a user's photo against specific criteria.

TASK (public): ${taskDescription}

EVALUATION CRITERIA (hidden from user): ${hiddenCriteria}

ANALYZE the submitted photo. DO NOT generate anything new.

Score 0-10:
  0 = photo does not match at all, or clearly from internet/screenshot
  1-3 = weak match, missing key elements
  4-6 = partial match, some elements present
  7-9 = good match, most criteria met
  10 = perfect match, all criteria clearly satisfied

Use the score_photo tool. Reasoning must be ONE short sentence in Bulgarian for the player.`;
}

async function callAi(systemPrompt: string, signedImageUrl: string): Promise<ScoreResult> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: signedImageUrl } },
          { type: 'text', text: 'Evaluate this submission and use the score_photo tool.' },
        ],
      },
    ],
    tools: [SCORE_TOOL],
    tool_choice: { type: 'function', function: { name: 'score_photo' } },
  };

  const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    const err: any = new Error(`AI gateway error ${res.status}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const data = await res.json();
  const argsStr = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!argsStr) throw new Error('AI returned no tool call');
  const parsed = JSON.parse(argsStr) as ScoreResult;
  if (
    typeof parsed.score !== 'number' ||
    parsed.score < 0 ||
    parsed.score > 10 ||
    typeof parsed.reasoning !== 'string'
  ) {
    throw new Error('AI returned invalid score payload');
  }
  return {
    score: Math.round(parsed.score),
    reasoning: parsed.reasoning,
    suspected_fraud: !!parsed.suspected_fraud,
  };
}

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

  const sessionId: string = payload?.session_id;
  const taskId: string = payload?.task_id;
  const submissionPath: string = payload?.submission_path;
  if (
    !sessionId ||
    !UUID_RE.test(sessionId) ||
    !taskId ||
    !UUID_RE.test(taskId) ||
    typeof submissionPath !== 'string' ||
    !submissionPath.startsWith(`${sessionId}/${taskId}/`)
  ) {
    return json({ error: 'Невалидни входни данни' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Load session
  const { data: session, error: sErr } = await supabase
    .from('quest_sessions')
    .select('id, quest_id, player_id, status, started_at')
    .eq('id', sessionId)
    .maybeSingle();
  if (sErr) {
    console.error('session lookup', sErr);
    return json({ error: 'Database error' }, 500);
  }
  if (!session) return json({ error: 'Сесията не съществува' }, 404);
  if (session.player_id !== userId) return json({ error: 'Forbidden' }, 403);
  if (session.status !== 'in_progress') {
    return json({ error: 'Сесията не е активна' }, 409);
  }

  // Load task (with hidden criteria — server-side only)
  const { data: task, error: tErr } = await supabase
    .from('quest_tasks')
    .select('id, quest_id, description, hidden_criteria, max_points, order_idx')
    .eq('id', taskId)
    .maybeSingle();
  if (tErr) {
    console.error('task lookup', tErr);
    return json({ error: 'Database error' }, 500);
  }
  if (!task) return json({ error: 'Задачата не съществува' }, 404);
  if (task.quest_id !== session.quest_id) return json({ error: 'Forbidden' }, 403);
  if (!task.hidden_criteria) {
    return json({ error: 'Тази задача не се оценява автоматично' }, 400);
  }

  // Multiplayer time-limit check (skip if not in a room)
  const { data: quest } = await supabase
    .from('quests')
    .select('time_limit_sec, mode')
    .eq('id', session.quest_id)
    .maybeSingle();

  if (quest?.mode === 'multiplayer' && quest.time_limit_sec) {
    const { data: room } = await supabase
      .from('multiplayer_rooms')
      .select('started_at, status')
      .eq('quest_id', session.quest_id)
      .in('status', ['in_progress', 'finished'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (room?.started_at) {
      const deadline =
        new Date(room.started_at).getTime() + quest.time_limit_sec * 1000;
      if (Date.now() > deadline) {
        return json({ error: 'Времето изтече' }, 410);
      }
    }
  }

  // Attempt count
  const { count: existingAttempts, error: cErr } = await supabase
    .from('task_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('session_id', sessionId)
    .eq('task_id', taskId);
  if (cErr) {
    console.error('attempt count', cErr);
    return json({ error: 'Database error' }, 500);
  }
  if ((existingAttempts ?? 0) >= MAX_ATTEMPTS) {
    return json({ error: 'Няма повече опити за тази задача' }, 409);
  }
  const attemptNo = (existingAttempts ?? 0) + 1;

  // Sign download URL for AI
  const { data: signed, error: signErr } = await supabase.storage
    .from(SUBMISSION_BUCKET)
    .createSignedUrl(submissionPath, SIGNED_TTL_SEC);
  if (signErr || !signed?.signedUrl) {
    console.error('sign submission', signErr);
    return json({ error: 'Не можахме да подготвим снимката' }, 500);
  }

  const systemPrompt = buildSystemPrompt(task.description, task.hidden_criteria);

  let result: ScoreResult;
  try {
    result = await callAi(systemPrompt, signed.signedUrl);
  } catch (e: any) {
    console.error('ai 1', e?.message, e?.body);
    if (e?.status === 429) return json({ error: 'AI системата е заета.' }, 429);
    if (e?.status === 402) return json({ error: 'Изчерпан AI кредит.' }, 402);
    try {
      result = await callAi(systemPrompt, signed.signedUrl);
    } catch (e2: any) {
      console.error('ai 2', e2?.message);
      return json({ error: 'AI не успя да оцени снимката. Опитай пак.' }, 502);
    }
  }

  // Insert submission
  const { error: insErr } = await supabase.from('task_submissions').insert({
    session_id: sessionId,
    task_id: taskId,
    attempt_no: attemptNo,
    storage_path: submissionPath,
    score: result.score,
    ai_reasoning: result.reasoning,
    fraud_suspected: result.suspected_fraud,
    fraud_reason: result.suspected_fraud ? 'AI flagged as screenshot/downloaded' : null,
  });
  if (insErr) {
    console.error('insert submission', insErr);
    return json({ error: 'Не успяхме да запазим резултата' }, 500);
  }

  // Check completion: count distinct task_ids whose best score >= 6 OR have 2 attempts
  const { data: allSubs } = await supabase
    .from('task_submissions')
    .select('task_id, score, attempt_no')
    .eq('session_id', sessionId);

  const { count: totalTasks } = await supabase
    .from('quest_tasks')
    .select('*', { count: 'exact', head: true })
    .eq('quest_id', session.quest_id);

  const finishedByTask = new Map<string, { best: number; attempts: number }>();
  for (const s of allSubs ?? []) {
    const cur = finishedByTask.get(s.task_id) ?? { best: -1, attempts: 0 };
    cur.best = Math.max(cur.best, s.score ?? 0);
    cur.attempts = Math.max(cur.attempts, s.attempt_no);
    finishedByTask.set(s.task_id, cur);
  }
  let finishedCount = 0;
  for (const v of finishedByTask.values()) {
    if (v.best >= 6 || v.attempts >= MAX_ATTEMPTS) finishedCount++;
  }

  let sessionCompleted = false;
  if (totalTasks && finishedCount >= totalTasks) {
    const { error: upErr } = await supabase
      .from('quest_sessions')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('status', 'in_progress');
    if (!upErr) sessionCompleted = true;
  }

  return json({
    score: result.score,
    reasoning: result.reasoning,
    fraud_suspected: result.suspected_fraud,
    attempt_no: attemptNo,
    is_last_attempt: attemptNo >= MAX_ATTEMPTS,
    session_completed: sessionCompleted,
  });
});
