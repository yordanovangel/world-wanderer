import { supabase } from '@/integrations/supabase/client';
import { invokeFn } from '@/lib/fn';
import type { SessionSummary } from './home';

export type SessionStatusFilter = 'all' | 'completed' | 'in_progress' | 'expired';

const SUMMARY_FIELDS =
  'session_id, player_id, quest_id, status, started_at, completed_at, quest_title, mode, creator_id, total_tasks, submitted_tasks, total_score, duration_sec';

export async function fetchSessionsPage(
  userId: string,
  filter: SessionStatusFilter,
  offset: number,
  limit: number,
): Promise<SessionSummary[]> {
  let q = supabase
    .from('user_session_summary' as any)
    .select(SUMMARY_FIELDS)
    .eq('player_id', userId);

  if (filter === 'completed') q = q.eq('status', 'completed');
  else if (filter === 'in_progress') q = q.eq('status', 'in_progress');
  else if (filter === 'expired') q = q.in('status', ['expired', 'abandoned']);

  q = q
    .order('started_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as SessionSummary[];
}

export type LeaderboardRow = {
  session_id: string;
  player_id: string;
  quest_id: string;
  nickname: string | null;
  total_score: number;
  duration_sec: number | null;
  status: 'in_progress' | 'completed' | 'abandoned' | 'expired';
  completed_at: string | null;
  rank: number | null;
};

export async function fetchQuestLeaderboard(quest_id: string): Promise<LeaderboardRow[]> {
  const { data, error } = await supabase
    .from('quest_leaderboard' as any)
    .select(
      'session_id, player_id, quest_id, nickname, total_score, duration_sec, status, completed_at, rank',
    )
    .eq('quest_id', quest_id)
    .order('rank', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as unknown as LeaderboardRow[];
}

export async function fetchCreatedQuestsAll(userId: string) {
  const { data, error } = await supabase
    .from('quests' as any)
    .select('id, title, mode, status, created_at')
    .eq('creator_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Array<{
    id: string;
    title: string;
    mode: 'solo' | 'multiplayer' | 'treasure_hunt';
    status: 'draft' | 'published' | 'archived';
    created_at: string;
  }>;
}

export async function fetchUserStats(userId: string): Promise<{
  played: number;
  created: number;
  totalScore: number;
}> {
  const [played, created, scoreAgg] = await Promise.all([
    supabase
      .from('user_session_summary' as any)
      .select('session_id', { count: 'exact', head: true })
      .eq('player_id', userId)
      .eq('status', 'completed'),
    supabase
      .from('quests' as any)
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', userId),
    supabase
      .from('user_session_summary' as any)
      .select('total_score')
      .eq('player_id', userId)
      .eq('status', 'completed'),
  ]);
  const totalScore = ((scoreAgg.data ?? []) as Array<{ total_score: number | null }>).reduce(
    (sum, r) => sum + (r.total_score ?? 0),
    0,
  );
  return {
    played: played.count ?? 0,
    created: created.count ?? 0,
    totalScore,
  };
}

/** Sign download URLs for an array of paths in a private bucket. */
export async function signDownloadUrls(input: {
  bucket: 'quest-sources' | 'task-references' | 'task-submissions';
  paths: string[];
  ttl_sec?: number;
}): Promise<string[]> {
  if (input.paths.length === 0) return [];
  const { urls } = await invokeFn<{ urls: string[] }>('sign-download-urls', input);
  return urls;
}
