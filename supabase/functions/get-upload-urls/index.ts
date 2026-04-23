import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { jwtVerify } from 'https://esm.sh/jose@5.9.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_COUNT = 5;

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
  } catch (e) {
    console.error('jwt verify failed', e);
    return null;
  }
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

  const purpose = payload?.purpose as string | undefined;
  const count = Math.min(Math.max(parseInt(payload?.count ?? '1', 10) || 1, 1), MAX_COUNT);
  const metadata = (payload?.metadata ?? {}) as Record<string, string | undefined>;

  if (!purpose || !['quest_source', 'task_reference', 'task_submission'].includes(purpose)) {
    return json({ error: 'Invalid purpose' }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let bucket: string;
  let pathFn: (i: number) => string;

  if (purpose === 'quest_source') {
    const questId = metadata.quest_id;
    if (!questId || !UUID_RE.test(questId)) {
      return json({ error: 'Missing or invalid quest_id' }, 400);
    }
    // Allow either: existing quest owned by user, OR a brand-new quest_id
    // (clients generate quest_id client-side before quest exists). We can't
    // verify ownership for the latter, but the path itself is namespaced by
    // user_id so other users can't write to it.
    const { data: q, error: qErr } = await supabase
      .from('quests')
      .select('creator_id')
      .eq('id', questId)
      .maybeSingle();
    if (qErr) {
      console.error('quest lookup', qErr);
      return json({ error: 'Database error' }, 500);
    }
    if (q && q.creator_id !== userId) {
      return json({ error: 'Forbidden' }, 403);
    }
    bucket = 'quest-sources';
    pathFn = () => `${userId}/${questId}/${crypto.randomUUID()}.jpg`;
  } else if (purpose === 'task_reference') {
    const questId = metadata.quest_id;
    const taskId = metadata.task_id; // optional for treasure draft (task not yet created)
    if (!questId || !UUID_RE.test(questId)) {
      return json({ error: 'Missing or invalid quest_id' }, 400);
    }
    if (taskId && !UUID_RE.test(taskId)) {
      return json({ error: 'Invalid task_id' }, 400);
    }
    const { data: q, error: qErr } = await supabase
      .from('quests')
      .select('creator_id')
      .eq('id', questId)
      .maybeSingle();
    if (qErr) {
      console.error('quest lookup', qErr);
      return json({ error: 'Database error' }, 500);
    }
    if (!q) return json({ error: 'Quest not found' }, 404);
    if (q.creator_id !== userId) return json({ error: 'Forbidden' }, 403);
    bucket = 'task-references';
    const folderId = taskId ?? 'pending';
    pathFn = () => `${questId}/${folderId}/${crypto.randomUUID()}.jpg`;
  } else {
    // task_submission
    const sessionId = metadata.session_id;
    const taskId = metadata.task_id;
    if (!sessionId || !UUID_RE.test(sessionId) || !taskId || !UUID_RE.test(taskId)) {
      return json({ error: 'Missing or invalid session_id/task_id' }, 400);
    }
    const { data: s, error: sErr } = await supabase
      .from('quest_sessions')
      .select('player_id')
      .eq('id', sessionId)
      .maybeSingle();
    if (sErr) {
      console.error('session lookup', sErr);
      return json({ error: 'Database error' }, 500);
    }
    if (!s) return json({ error: 'Session not found' }, 404);
    if (s.player_id !== userId) return json({ error: 'Forbidden' }, 403);
    bucket = 'task-submissions';
    pathFn = (i) => `${sessionId}/${taskId}/${Date.now()}_${i}_${crypto.randomUUID()}.jpg`;
  }

  const upload_urls: string[] = [];
  const paths: string[] = [];

  for (let i = 0; i < count; i++) {
    const path = pathFn(i);
    const { data, error } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) {
      console.error('createSignedUploadUrl', error);
      return json({ error: 'Failed to create upload URL' }, 500);
    }
    upload_urls.push(data.signedUrl);
    paths.push(path);
  }

  return json({ bucket, upload_urls, paths });
});
