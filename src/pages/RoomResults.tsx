import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import {
  fetchLeaderboardForRoom,
  fetchRoom,
  fetchRoomPlayers,
} from '@/lib/queries/multiplayer';

const MEDAL_ACCENTS = ['border-l-ochre-700', 'border-l-ochre-500', 'border-l-terracotta-500'];

export default function RoomResultsPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const roomQ = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => fetchRoom(roomId!),
    enabled: !!roomId,
  });
  const playersQ = useQuery({
    queryKey: ['room-players', roomId],
    queryFn: () => fetchRoomPlayers(roomId!),
    enabled: !!roomId,
  });

  const sessionIds = (playersQ.data ?? []).map((p) => p.session_id);
  const lbQ = useQuery({
    queryKey: ['leaderboard', roomQ.data?.quest_id, sessionIds.join(',')],
    queryFn: () =>
      fetchLeaderboardForRoom(roomQ.data!.quest_id, sessionIds),
    enabled: !!roomQ.data?.quest_id && sessionIds.length > 0,
    refetchInterval: 4000,
  });

  // No useEffect navigation needed; let user view results

  if (roomQ.isLoading || playersQ.isLoading || lbQ.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      </div>
    );
  }

  const rows = lbQ.data ?? [];
  const completed = rows.filter((r) => r.status === 'completed');
  const others = rows.filter((r) => r.status !== 'completed');

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <header className="text-center">
        <Trophy className="mx-auto h-10 w-10 text-ochre-700" />
        <h1 className="mt-2 font-display text-[32px] text-ink-900">Резултати</h1>
      </header>

      <ol className="mt-6 space-y-2">
        {completed.map((row, i) => (
          <LeaderboardItem
            key={row.session_id}
            row={row}
            index={i}
            isMe={row.player_id === user?.id}
          />
        ))}
        {others.length > 0 && (
          <li className="pt-4 text-xs uppercase tracking-wide text-ink-500">Не завършиха</li>
        )}
        {others.map((row) => (
          <LeaderboardItem
            key={row.session_id}
            row={row}
            index={null}
            isMe={row.player_id === user?.id}
          />
        ))}
        {rows.length === 0 && (
          <li className="rounded-xl border border-dashed border-parchment-200 px-3 py-6 text-center text-sm text-ink-500">
            Все още няма резултати.
          </li>
        )}
      </ol>

      <button
        type="button"
        onClick={() => navigate('/home')}
        className="mt-8 flex h-12 w-full items-center justify-center rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
      >
        Към моите игри
      </button>
    </div>
  );
}

function LeaderboardItem({
  row,
  index,
  isMe,
}: {
  row: ReturnType<typeof Object> & {
    player_id: string;
    nickname: string | null;
    total_score: number;
    duration_sec: number | null;
    status: string;
  };
  index: number | null;
  isMe: boolean;
}) {
  const accent = index !== null && index < 3 ? MEDAL_ACCENTS[index] : 'border-l-parchment-200';
  const initials = (row.nickname ?? '?').slice(0, 2).toUpperCase();
  return (
    <li
      className={`flex items-center gap-3 rounded-xl border-l-4 bg-white px-3 py-3 shadow-soft ${accent} ${
        isMe ? 'bg-parchment-100' : ''
      }`}
    >
      <span className="w-6 text-center font-mono text-sm text-ink-500">
        {index !== null ? index + 1 : '–'}
      </span>
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ochre-500 text-sm font-semibold text-ink-900">
        {initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink-900">
          {row.nickname ?? 'Играч'}
          {isMe && <span className="ml-1 text-xs text-ink-500">(ти)</span>}
        </p>
        <p className="text-xs text-ink-500">
          {row.status === 'completed' ? 'Завършен' : row.status === 'abandoned' ? 'Прекратен' : 'Изтекъл'}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono text-base font-semibold text-ochre-700">
          {row.total_score ?? 0}
        </p>
        {row.duration_sec != null && (
          <p className="font-mono text-[11px] text-ink-500">
            {formatDuration(row.duration_sec)}
          </p>
        )}
      </div>
    </li>
  );
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
