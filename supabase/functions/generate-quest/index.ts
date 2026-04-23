import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { jwtVerify } from 'https://esm.sh/jose@5.9.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SOURCE_BUCKET = 'quest-sources';
const SIGNED_TTL_SEC = 600;
const RATE_LIMIT_PER_HOUR = 5;
const AI_MODEL = 'google/gemini-2.5-pro';

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

const SYSTEM_PROMPT = `You are a quest designer. The user has sent 1-3 photos of their immediate surroundings (home, park, street, office, etc.).

ANALYZE the photos — do NOT describe a new scene. Base everything on what is actually visible.

Generate a quest with a RANDOM number of tasks between 4 and 11. Tasks must be fun, safe, legal, and physically doable by someone standing in this environment right now. They should involve finding/photographing real things.

Each task has TWO parts:
- PUBLIC (shown to player): title + description in Bulgarian
- HIDDEN (used later to score submitted photos): detailed criteria in English, describing exactly what a correct photo must contain. This is a system instruction — reviewer should EVALUATE the user's submitted photo against these criteria, NOT generate a new one.

Use the suggest_quest tool to return the result. Vary the number of tasks. Mix difficulties.`;

const QUEST_TOOL = {
  type: 'function',
  function: {
    name: 'suggest_quest',
    description: 'Return the generated quest with public tasks and hidden criteria.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Quest title in Bulgarian' },
        description: { type: 'string', description: 'One-sentence hook in Bulgarian' },
        tasks: {
          type: 'array',
          description: 'Between 4 and 11 tasks',
          items: {
            type: 'object',
            properties: {
              order: { type: 'integer', description: 'Order index starting at 1' },
              title: { type: 'string', description: 'Task title in Bulgarian' },
              description: {
                type: 'string',
                description: '1-2 sentences in Bulgarian — what to photograph',
              },
              hidden_criteria: {
                type: 'string',
                description:
                  'English; for the AI evaluator. What must be in the photo for full marks, partial credit conditions, what is disqualifying.',
              },
              max_points: { type: 'integer', description: 'Always 10' },
            },
            required: ['order', 'title', 'description', 'hidden_criteria', 'max_points'],
          },
        },
      },
      required: ['title', 'description', 'tasks'],
    },
  },
} as const;

type GeneratedTask = {
  order: number;
  title: string;
  description: string;
  hidden_criteria: string;
  max_points: number;
};

type GeneratedQuest = {
  title: string;
  description: string;
  tasks: GeneratedTask[];
};

async function callAi(signedUrls: string[]): Promise<GeneratedQuest> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) throw new Error('LOVABLE_API_KEY missing');

  const userContent: any[] = signedUrls.map((url) => ({
    type: 'image_url',
    image_url: { url },
  }));
  userContent.push({
    type: 'text',
    text: 'Generate the quest based on these photos. Use the suggest_quest tool.',
  });

  const body = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ],
    tools: [QUEST_TOOL],
    tool_choice: { type: 'function', function: { name: 'suggest_quest' } },
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
  const call = data?.choices?.[0]?.message?.tool_calls?.[0];
  const argsStr = call?.function?.arguments;
  if (!argsStr) throw new Error('AI returned no tool call');
  let parsed: GeneratedQuest;
  try {
    parsed = JSON.parse(argsStr);
  } catch (e) {
    throw new Error('AI returned malformed JSON');
  }
  if (
    !parsed?.title ||
    !parsed?.description ||
    !Array.isArray(parsed.tasks) ||
    parsed.tasks.length < 4 ||
    parsed.tasks.length > 11
  ) {
    throw new Error('AI returned invalid quest structure');
  }
  return parsed;
}

function nanoToken(len = 10): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789abcdefghijkmnpqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = '';
  for (let i = 0; i < len; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
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

  const sourcePaths: string[] = Array.isArray(payload?.source_paths) ? payload.source_paths : [];
  const mode: 'solo' | 'multiplayer' = payload?.mode === 'multiplayer' ? 'multiplayer' : 'solo';
  const timeLimitSec: number | null =
    typeof payload?.time_limit_sec === 'number' && payload.time_limit_sec > 0
      ? Math.floor(payload.time_limit_sec)
      : null;

  if (sourcePaths.length < 1 || sourcePaths.length > 3) {
    return json({ error: 'Изпрати между 1 и 3 снимки' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Rate limit: count quests created by this user in last hour
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count: recentCount, error: rlErr } = await supabase
    .from('quests')
    .select('*', { count: 'exact', head: true })
    .eq('creator_id', userId)
    .gte('created_at', since);
  if (rlErr) console.error('rate-limit', rlErr);
  if ((recentCount ?? 0) >= RATE_LIMIT_PER_HOUR) {
    return json({ error: 'Прекалено много quest-ове за час. Опитай след малко.' }, 429);
  }

  // Verify each source path is namespaced under this user
  for (const p of sourcePaths) {
    if (typeof p !== 'string' || !p.startsWith(`${userId}/`)) {
      return json({ error: 'Невалиден път на снимка' }, 400);
    }
  }

  // Sign download URLs for the AI
  const signedUrls: string[] = [];
  for (const p of sourcePaths) {
    const { data, error } = await supabase.storage
      .from(SOURCE_BUCKET)
      .createSignedUrl(p, SIGNED_TTL_SEC);
    if (error || !data?.signedUrl) {
      console.error('sign url', error);
      return json({ error: 'Не можахме да подготвим снимките' }, 500);
    }
    signedUrls.push(data.signedUrl);
  }

  // Call AI (one retry on parse failure)
  let generated: GeneratedQuest;
  try {
    generated = await callAi(signedUrls);
  } catch (e: any) {
    console.error('ai call 1', e?.message, e?.body);
    if (e?.status === 429) {
      return json({ error: 'AI системата е заета. Опитай отново след минута.' }, 429);
    }
    if (e?.status === 402) {
      return json({ error: 'Изчерпан AI кредит на работното пространство.' }, 402);
    }
    try {
      generated = await callAi(signedUrls);
    } catch (e2: any) {
      console.error('ai call 2', e2?.message);
      return json({ error: 'AI не успя да генерира quest. Опитай пак.' }, 502);
    }
  }

  // Persist
  const shareToken = nanoToken(10);
  const { data: questRow, error: qErr } = await supabase
    .from('quests')
    .insert({
      creator_id: userId,
      mode,
      title: generated.title.slice(0, 200),
      description: (generated.description ?? '').slice(0, 1000),
      status: 'published',
      share_token: shareToken,
      time_limit_sec: timeLimitSec,
    })
    .select('id, share_token')
    .single();
  if (qErr || !questRow) {
    console.error('insert quest', qErr);
    return json({ error: 'Не успяхме да запазим quest-а' }, 500);
  }

  const sourceRows = sourcePaths.map((p, i) => ({
    quest_id: questRow.id,
    storage_path: p,
    order_idx: i,
  }));
  const { error: srcErr } = await supabase.from('quest_source_images').insert(sourceRows);
  if (srcErr) {
    console.error('insert sources', srcErr);
    await supabase.from('quests').delete().eq('id', questRow.id);
    return json({ error: 'Не успяхме да запазим снимките' }, 500);
  }

  const taskRows = generated.tasks
    .slice(0, 11)
    .map((t, i) => ({
      quest_id: questRow.id,
      order_idx: i + 1,
      title: t.title.slice(0, 200),
      description: t.description.slice(0, 1000),
      hidden_criteria: t.hidden_criteria.slice(0, 4000),
      max_points: 10,
    }));
  const { data: insertedTasks, error: tErr } = await supabase
    .from('quest_tasks')
    .insert(taskRows)
    .select('id, order_idx, title, description, max_points');
  if (tErr || !insertedTasks) {
    console.error('insert tasks', tErr);
    await supabase.from('quests').delete().eq('id', questRow.id);
    return json({ error: 'Не успяхме да запазим задачите' }, 500);
  }

  return json({
    quest_id: questRow.id,
    share_token: questRow.share_token,
    title: generated.title,
    description: generated.description,
    tasks: insertedTasks
      .sort((a: any, b: any) => a.order_idx - b.order_idx)
      .map((t: any) => ({
        id: t.id,
        order_idx: t.order_idx,
        title: t.title,
        description: t.description,
        max_points: t.max_points,
      })),
  });
});
