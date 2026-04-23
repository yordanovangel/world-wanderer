import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { jwtVerify } from 'https://esm.sh/jose@5.9.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const ALLOWED_BUCKETS = new Set(['quest-sources', 'task-references', 'task-submissions']);
const MAX_PATHS = 20;
const MAX_TTL = 3600;
const DEFAULT_TTL = 600;

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

/**
 * Issue signed download URLs for private storage objects, after authorizing the
 * caller against the relevant DB row(s).
 */
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

  const bucket: string = payload?.bucket;
  const paths: string[] = Array.isArray(payload?.paths) ? payload.paths : [];
  const ttl = Math.min(
    Math.max(parseInt(payload?.ttl_sec ?? DEFAULT_TTL, 10) || DEFAULT_TTL, 60),
    MAX_TTL,
  );

  if (!ALLOWED_BUCKETS.has(bucket)) return json({ error: 'Invalid bucket' }, 400);
  if (paths.length === 0 || paths.length > MAX_PATHS) {
    return json({ error: 'Invalid paths' }, 400);
  }
  for (const p of paths) {
    if (typeof p !== 'string' || p.includes('..') || p.startsWith('/')) {
      return json({ error: 'Invalid path' }, 400);
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Authorize per bucket
  if (bucket === 'quest-sources') {
    // Path = `${creator_id}/${quest_id}/...`
    // Allow if user is creator OR a player with an active session for any of
    // the quest_ids referenced. Easiest: derive distinct quest_ids and check.
    const questIds = new Set<string>();
    for (const p of paths) {
      const parts = p.split('/');
      if (parts.length < 3) return json({ error: 'Invalid path shape' }, 400);
      questIds.add(parts[1]);
    }
    const { data: quests, error: qErr } = await supabase
      .from('quests')
      .select('id, creator_id')
      .in('id', Array.from(questIds));
    if (qErr) return json({ error: 'Database error' }, 500);
    const ownsAll = (quests ?? []).every((q: any) => q.creator_id === userId);
    if (!ownsAll) {
      // Allow if user has a session for every quest_id referenced
      const { data: sessions } = await supabase
        .from('quest_sessions')
        .select('quest_id')
        .eq('player_id', userId)
        .in('quest_id', Array.from(questIds));
      const hasAll = Array.from(questIds).every((qid) =>
        (sessions ?? []).some((s: any) => s.quest_id === qid),
      );
      if (!hasAll) return json({ error: 'Forbidden' }, 403);
    }
  } else if (bucket === 'task-references') {
    // Path = `${quest_id}/${task_id}/...` — only the creator may view.
    const questIds = new Set<string>();
    for (const p of paths) {
      const parts = p.split('/');
      if (parts.length < 3) return json({ error: 'Invalid path shape' }, 400);
      questIds.add(parts[0]);
    }
    const { data: quests } = await supabase
      .from('quests')
      .select('id, creator_id')
      .in('id', Array.from(questIds));
    const ownsAll = (quests ?? []).every((q: any) => q.creator_id === userId);
    if (!ownsAll) return json({ error: 'Forbidden' }, 403);
  } else if (bucket === 'task-submissions') {
    // Path = `${session_id}/${task_id}/...` — owner of session OR creator of quest.
    const sessionIds = new Set<string>();
    for (const p of paths) {
      const parts = p.split('/');
      if (parts.length < 3) return json({ error: 'Invalid path shape' }, 400);
      sessionIds.add(parts[0]);
    }
    const { data: sessions } = await supabase
      .from('quest_sessions')
      .select('id, player_id, quest_id')
      .in('id', Array.from(sessionIds));
    const ownsAll = (sessions ?? []).every((s: any) => s.player_id === userId);
    if (!ownsAll) {
      const questIds = new Set<string>((sessions ?? []).map((s: any) => s.quest_id));
      const { data: quests } = await supabase
        .from('quests')
        .select('id, creator_id')
        .in('id', Array.from(questIds));
      const ownerByQuest = new Map<string, string>(
        (quests ?? []).map((q: any) => [q.id, q.creator_id]),
      );
      const ok = (sessions ?? []).every((s: any) => {
        if (s.player_id === userId) return true;
        return ownerByQuest.get(s.quest_id) === userId;
      });
      if (!ok) return json({ error: 'Forbidden' }, 403);
    }
  }

  const urls: string[] = [];
  for (const p of paths) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(p, ttl);
    if (error || !data?.signedUrl) {
      console.error('sign', error);
      return json({ error: 'Sign failed' }, 500);
    }
    urls.push(data.signedUrl);
  }

  return json({ urls });
});
