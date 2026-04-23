import { supabase } from '@/integrations/supabase/client';
import { invokeFn } from '@/lib/fn';

export type MultiplayerRoom = {
  id: string;
  quest_id: string;
  host_id: string;
  status: 'lobby' | 'in_progress' | 'cancelled' | 'finished';
  started_at: string | null;
  ended_at: string | null;
  created_at: string | null;
};

export type RoomPlayer = {
  room_id: string;
  player_id: string;
  session_id: string;
  joined_at: string | null;
  nickname: string | null;
};

export type LeaderboardRow = {
  session_id: string;
  player_id: string;
  nickname: string | null;
  total_score: number;
  duration_sec: number | null;
  status: string;
  rank: number | null;
  completed_at: string | null;
};

export async function createMultiplayerRoom(quest_id: string): Promise<{
  room_id: string;
  status: string;
}> {
  return invokeFn('create-multiplayer-room', { quest_id });
}

export async function startMultiplayerRoom(room_id: string): Promise<{ started_at: string }> {
  return invokeFn('start-multiplayer-room', { room_id });
}

export async function cancelMultiplayerRoom(room_id: string): Promise<{ ok: boolean }> {
  return invokeFn('cancel-multiplayer-room', { room_id });
}

export async function joinQuest(share_token: string): Promise<{
  redirect: string;
  session_id: string;
  mode: string;
  room_id?: string;
}> {
  return invokeFn('join-quest', { share_token });
}

export async function fetchRoom(room_id: string): Promise<MultiplayerRoom | null> {
  const { data, error } = await supabase
    .from('multiplayer_rooms' as any)
    .select('id, quest_id, host_id, status, started_at, ended_at, created_at')
    .eq('id', room_id)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as MultiplayerRoom) ?? null;
}

export async function fetchRoomPlayers(room_id: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('room_players' as any)
    .select('room_id, player_id, session_id, joined_at, users(nickname)')
    .eq('room_id', room_id)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    room_id: row.room_id,
    player_id: row.player_id,
    session_id: row.session_id,
    joined_at: row.joined_at,
    nickname: row.users?.nickname ?? null,
  }));
}

export async function fetchLeaderboardForRoom(
  quest_id: string,
  session_ids: string[],
): Promise<LeaderboardRow[]> {
  if (session_ids.length === 0) return [];
  const { data, error } = await supabase
    .from('quest_leaderboard' as any)
    .select('session_id, player_id, nickname, total_score, duration_sec, status, rank, completed_at')
    .eq('quest_id', quest_id)
    .in('session_id', session_ids);
  if (error) throw error;
  return ((data ?? []) as unknown as LeaderboardRow[]).sort((a, b) => {
    // Completed first, then by rank/score desc
    if (a.status === 'completed' && b.status !== 'completed') return -1;
    if (b.status === 'completed' && a.status !== 'completed') return 1;
    return (b.total_score ?? 0) - (a.total_score ?? 0);
  });
}
