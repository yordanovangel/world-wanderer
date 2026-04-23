import { supabase } from '@/integrations/supabase/client';
import { invokeFn } from '@/lib/fn';

export type PublicTask = {
  id: string;
  quest_id: string;
  order_idx: number;
  title: string;
  description: string;
  max_points: number;
  reference_image_path: string | null;
};

export type Quest = {
  id: string;
  title: string;
  description: string | null;
  mode: 'solo' | 'multiplayer' | 'treasure_hunt';
  share_token: string;
  creator_id: string;
  time_limit_sec: number | null;
};

export type Submission = {
  id: string;
  task_id: string;
  attempt_no: number;
  storage_path: string;
  score: number | null;
  ai_reasoning: string | null;
  submitted_at: string;
};

export type Session = {
  id: string;
  quest_id: string;
  player_id: string;
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired';
  task_order: string[] | null;
  started_at: string;
  completed_at: string | null;
};

export async function generateSoloQuest(input: {
  source_paths: string[];
}): Promise<{
  quest_id: string;
  share_token: string;
  title: string;
  description: string;
  tasks: Array<Pick<PublicTask, 'id' | 'order_idx' | 'title' | 'description' | 'max_points'>>;
}> {
  return invokeFn('generate-quest', { ...input, mode: 'solo' });
}

export async function startSession(quest_id: string): Promise<{ session_id: string; resumed: boolean }> {
  return invokeFn('start-session', { quest_id });
}

export async function scoreSubmission(input: {
  session_id: string;
  task_id: string;
  submission_path: string;
}): Promise<{
  score: number;
  reasoning: string;
  fraud_suspected: boolean;
  attempt_no: number;
  is_last_attempt: boolean;
  session_completed: boolean;
}> {
  return invokeFn('score-submission', input);
}

export async function fetchQuest(id: string): Promise<Quest | null> {
  const { data, error } = await supabase
    .from('quests' as any)
    .select('id, title, description, mode, share_token, creator_id, time_limit_sec')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Quest) ?? null;
}

export async function fetchPublicTasks(quest_id: string): Promise<PublicTask[]> {
  const { data, error } = await supabase
    .from('quest_tasks_public' as any)
    .select('id, quest_id, order_idx, title, description, max_points, reference_image_path')
    .eq('quest_id', quest_id)
    .order('order_idx', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PublicTask[];
}

export async function fetchActiveSession(
  quest_id: string,
  player_id: string,
): Promise<Session | null> {
  const { data, error } = await supabase
    .from('quest_sessions' as any)
    .select('id, quest_id, player_id, status, task_order, started_at, completed_at')
    .eq('quest_id', quest_id)
    .eq('player_id', player_id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Session) ?? null;
}

export async function fetchSession(session_id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('quest_sessions' as any)
    .select('id, quest_id, player_id, status, task_order, started_at, completed_at')
    .eq('id', session_id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Session) ?? null;
}

export async function fetchSubmissions(session_id: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('task_submissions' as any)
    .select('id, task_id, attempt_no, storage_path, score, ai_reasoning, submitted_at')
    .eq('session_id', session_id)
    .order('submitted_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Submission[];
}

export type ShareTokenLookup = {
  quest_id: string;
  title: string;
  mode: 'solo' | 'multiplayer' | 'treasure_hunt';
  status: 'draft' | 'published' | 'archived';
};

/** Public lookup of a share token (no auth required) — used by /join/:token. */
export async function lookupShareToken(share_token: string): Promise<ShareTokenLookup> {
  return invokeFn('lookup-share-token', { share_token });
}

/** Archive a quest (creator only). */
export async function archiveQuest(quest_id: string): Promise<{ ok: boolean; status: string }> {
  return invokeFn('archive-quest', { quest_id });
}

export async function fetchSourceImagePaths(quest_id: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('quest_source_images' as any)
    .select('storage_path, order_idx')
    .eq('quest_id', quest_id)
    .order('order_idx', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Array<{ storage_path: string }>;
  return rows.map((r) => r.storage_path);
}
