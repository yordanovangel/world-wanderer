import { supabase } from '@/integrations/supabase/client';

export type SessionSummary = {
  session_id: string;
  player_id: string;
  quest_id: string;
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired';
  started_at: string;
  completed_at: string | null;
  quest_title: string;
  mode: 'solo' | 'multiplayer' | 'treasure_hunt';
  creator_id: string;
  total_tasks: number;
  submitted_tasks: number;
  total_score: number;
  duration_sec: number;
};

export type CreatedQuest = {
  id: string;
  title: string;
  mode: 'solo' | 'multiplayer' | 'treasure_hunt';
  status: 'draft' | 'published' | 'archived';
  created_at: string;
};

const SUMMARY_FIELDS =
  'session_id, player_id, quest_id, status, started_at, completed_at, quest_title, mode, creator_id, total_tasks, submitted_tasks, total_score, duration_sec';

export async function fetchInProgressSessions(userId: string): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('user_session_summary' as any)
    .select(SUMMARY_FIELDS)
    .eq('player_id', userId)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as SessionSummary[];
}

export async function fetchPastSessions(userId: string, limit = 3): Promise<SessionSummary[]> {
  const { data, error } = await supabase
    .from('user_session_summary' as any)
    .select(SUMMARY_FIELDS)
    .eq('player_id', userId)
    .in('status', ['completed', 'abandoned', 'expired'])
    .order('completed_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as SessionSummary[];
}

export async function fetchCreatedQuests(userId: string, limit = 3): Promise<CreatedQuest[]> {
  const { data, error } = await supabase
    .from('quests' as any)
    .select('id, title, mode, status, created_at')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as CreatedQuest[];
}
