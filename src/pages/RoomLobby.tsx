import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, Play, Share2, Crown, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/hooks/use-toast';
import { fetchQuest, fetchPublicTasks } from '@/lib/queries/quests';
import {
  cancelMultiplayerRoom,
  fetchRoom,
  fetchRoomPlayers,
  startMultiplayerRoom,
} from '@/lib/queries/multiplayer';
import { ShareModal } from '@/components/ShareModal';

export default function RoomLobbyPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [showShare, setShowShare] = useState(false);

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
  const questQ = useQuery({
    queryKey: ['quest', roomQ.data?.quest_id],
    queryFn: () => fetchQuest(roomQ.data!.quest_id),
    enabled: !!roomQ.data?.quest_id,
  });
  const tasksQ = useQuery({
    queryKey: ['quest-tasks', roomQ.data?.quest_id],
    queryFn: () => fetchPublicTasks(roomQ.data!.quest_id),
    enabled: !!roomQ.data?.quest_id,
  });

  // Realtime subscriptions for players + room status
  useEffect(() => {
    if (!roomId) return;
    const ch = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` },
        () => qc.invalidateQueries({ queryKey: ['room-players', roomId] }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'multiplayer_rooms', filter: `id=eq.${roomId}` },
        () => qc.invalidateQueries({ queryKey: ['room', roomId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId, qc]);

  const room = roomQ.data;
  const isHost = !!room && !!user && room.host_id === user.id;
  const players = playersQ.data ?? [];
  const playerCount = players.length;

  // React to status transitions
  useEffect(() => {
    if (!room) return;
    if (room.status === 'in_progress') {
      navigate(`/room/${room.id}/play`, { replace: true });
    } else if (room.status === 'cancelled') {
      toast({ title: 'Играта беше прекратена от host-а' });
      navigate('/home', { replace: true });
    }
  }, [room, navigate]);

  const shareToken = questQ.data?.share_token ?? '';
    if (!roomId || !isHost || playerCount < 2) return;
    setBusy(true);
    try {
      await startMultiplayerRoom(roomId);
      // Realtime will navigate.
    } catch (e: any) {
      toast({ title: 'Грешка', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const onCancel = async () => {
    if (!roomId || !isHost) return;
    if (!confirm('Сигурен ли си? Играта се прекратява за всички.')) return;
    setBusy(true);
    try {
      await cancelMultiplayerRoom(roomId);
    } catch (e: any) {
      toast({ title: 'Грешка', description: e?.message, variant: 'destructive' });
      setBusy(false);
    }
  };

  if (roomQ.isLoading || questQ.isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      </div>
    );
  }
  if (!room || !questQ.data) {
    return <div className="p-6 text-center text-ink-500">Стаята не съществува</div>;
  }

  const timeLimitMin = questQ.data.time_limit_sec
    ? Math.round(questQ.data.time_limit_sec / 60)
    : null;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <h1 className="font-display text-[24px] text-ink-900">Стая за приключение</h1>

      <article className="mt-4 rounded-2xl border border-parchment-200 bg-white p-4 shadow-soft">
        <h2 className="font-display text-[20px] text-ink-900">{questQ.data.title}</h2>
        {questQ.data.description && (
          <p className="mt-1 text-sm text-ink-500">{questQ.data.description}</p>
        )}
        <p className="mt-2 text-xs uppercase tracking-wide text-ink-300">
          {tasksQ.data?.length ?? '…'} задачи{timeLimitMin ? ` · ${timeLimitMin} мин` : ''}
        </p>
      </article>

      {shareUrl && (
        <section className="mt-5 rounded-2xl border border-parchment-200 bg-parchment-50 p-5 shadow-soft">
          <div className="flex justify-center">
            <div className="rounded-xl bg-white p-3 shadow-soft">
              <QRCodeSVG
                value={shareUrl}
                size={200}
                level="M"
                marginSize={2}
                fgColor="#7a3a1f"
                bgColor="#fbf6ec"
              />
            </div>
          </div>
          <p className="mt-3 break-all rounded-lg bg-white px-3 py-2 text-center font-mono text-xs text-ink-700 shadow-soft">
            {shareUrl}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-ink-900 shadow-soft hover:bg-parchment-100"
            >
              <Copy size={14} /> Копирай
            </button>
            <button
              type="button"
              onClick={onShare}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-ink-900 shadow-soft hover:bg-parchment-100"
            >
              <Share2 size={14} /> Сподели
            </button>
          </div>
        </section>
      )}

      <section className="mt-5">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-[18px] text-ink-900">Играчи</h3>
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {playerCount}/5
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {players.map((p) => {
            const isMe = p.player_id === user?.id;
            const isHostRow = p.player_id === room.host_id;
            const initials = (p.nickname ?? '?').slice(0, 2).toUpperCase();
            return (
              <li
                key={p.player_id}
                className="flex items-center gap-3 rounded-xl bg-white px-3 py-2 shadow-soft"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ochre-500 text-sm font-semibold text-ink-900">
                  {initials}
                </div>
                <span className="flex-1 truncate text-sm text-ink-900">
                  {p.nickname ?? 'Играч'}
                  {isMe && <span className="ml-1 text-xs text-ink-500">(ти)</span>}
                </span>
                {isHostRow && <Crown size={16} className="text-ochre-700" />}
              </li>
            );
          })}
          {playerCount === 0 && (
            <li className="rounded-xl border border-dashed border-parchment-200 px-3 py-4 text-center text-xs text-ink-500">
              Изчакваме играчи…
            </li>
          )}
        </ul>
      </section>

      {isHost ? (
        <div className="mt-8 space-y-2">
          <button
            type="button"
            onClick={onStart}
            disabled={playerCount < 2 || busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none"
          >
            <Play size={18} /> Започни ({playerCount}/5)
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-danger-600/30 bg-transparent px-4 text-sm font-semibold text-danger-600 hover:bg-danger-600/10 disabled:opacity-60"
          >
            <LogOut size={14} /> Отмени стая
          </button>
        </div>
      ) : (
        <p className="mt-8 text-center text-sm italic text-ink-500">
          Изчакваме host-а да стартира…
        </p>
      )}
    </div>
  );
}
