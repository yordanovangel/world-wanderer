import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { CameraCapture } from '@/components/CameraCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  fetchPublicTasks,
  fetchQuest,
  fetchSubmissions,
  fetchActiveSession,
} from '@/lib/queries/quests';
import { fetchRoom } from '@/lib/queries/multiplayer';
import { computeProgress, SOLO_MAX_ATTEMPTS } from '@/lib/quest-progress';

export default function RoomPlayPage() {
  const { id: roomId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { upload, isUploading } = useImageUpload('task_submission');
  const [now, setNow] = useState(Date.now());

  const roomQ = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => fetchRoom(roomId!),
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
  const sessionQ = useQuery({
    queryKey: ['active-session', roomQ.data?.quest_id, user?.id],
    queryFn: () => fetchActiveSession(roomQ.data!.quest_id, user!.id),
    enabled: !!roomQ.data?.quest_id && !!user,
  });
  const submissionsQ = useQuery({
    queryKey: ['submissions', sessionQ.data?.id],
    queryFn: () => fetchSubmissions(sessionQ.data!.id),
    enabled: !!sessionQ.data?.id,
  });

  // Subscribe for room status changes (so cancellation kicks players out)
  useEffect(() => {
    if (!roomId) return;
    const ch = supabase
      .channel(`room-play:${roomId}`)
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

  // Tick timer
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // React to room status (cancelled)
  useEffect(() => {
    if (!roomQ.data) return;
    if (roomQ.data.status === 'cancelled') {
      toast({ title: 'Играта беше прекратена от host-а' });
      navigate('/home', { replace: true });
    } else if (roomQ.data.status === 'finished') {
      navigate(`/room/${roomQ.data.id}/results`, { replace: true });
    }
  }, [roomQ.data, navigate]);

  const deadline = useMemo(() => {
    if (!roomQ.data?.started_at || !questQ.data?.time_limit_sec) return null;
    return new Date(roomQ.data.started_at).getTime() + questQ.data.time_limit_sec * 1000;
  }, [roomQ.data, questQ.data]);

  const remainingSec = deadline ? Math.max(0, Math.floor((deadline - now) / 1000)) : null;

  // Auto-navigate when timer hits 0
  useEffect(() => {
    if (remainingSec !== null && remainingSec <= 0 && roomId) {
      navigate(`/room/${roomId}/results`, { replace: true });
    }
  }, [remainingSec, roomId, navigate]);

  const progress = useMemo(() => {
    if (!tasksQ.data || !submissionsQ.data) return null;
    return computeProgress(tasksQ.data, submissionsQ.data, sessionQ.data?.task_order ?? null);
  }, [tasksQ.data, submissionsQ.data, sessionQ.data]);

  const isLoading =
    roomQ.isLoading ||
    questQ.isLoading ||
    tasksQ.isLoading ||
    sessionQ.isLoading ||
    submissionsQ.isLoading;

  if (isLoading || !progress || !roomId || !sessionQ.data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      </div>
    );
  }

  const total = progress.states.length;

  if (progress.isComplete) {
    navigate(`/room/${roomId}/results`, { replace: true });
    return null;
  }

  const currentState = progress.states[progress.currentIndex];
  const currentTask = currentState.task;
  const attemptsLeft = SOLO_MAX_ATTEMPTS - currentState.attempts.length;
  const sessionId = sessionQ.data.id;

  const onCapture = async (blob: Blob) => {
    if (!sessionId) return;
    if (remainingSec !== null && remainingSec <= 0) {
      toast({ title: 'Времето изтече', variant: 'destructive' });
      return;
    }
    try {
      const { storage_path } = await upload(blob, {
        session_id: sessionId,
        task_id: currentTask.id,
      });
      navigate(
        `/quest/${roomQ.data!.quest_id}/scoring?session=${sessionId}&task=${currentTask.id}&path=${encodeURIComponent(
          storage_path,
        )}&room=${roomId}`,
      );
    } catch (e: any) {
      toast({ title: 'Грешка при качване', description: e?.message, variant: 'destructive' });
    }
  };

  const timerColor =
    remainingSec !== null && remainingSec < 60 ? 'text-terracotta-700' : 'text-ink-700';

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <Link to="/home" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <ArrowLeft size={16} /> Изход
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            Задача {progress.currentIndex + 1}/{total}
          </span>
          {remainingSec !== null && (
            <span className={`font-mono text-base font-semibold ${timerColor}`}>
              {formatTime(remainingSec)}
            </span>
          )}
        </div>
      </div>

      <article className="mt-5 rounded-2xl border-l-4 border-terracotta-500 bg-parchment-50 p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          Задача {progress.currentIndex + 1}
        </p>
        <h1 className="mt-1 font-display text-[24px] leading-tight text-ink-900">
          {currentTask.title}
        </h1>
        <p className="mt-2 max-w-prose text-base text-ink-700">{currentTask.description}</p>
      </article>

      <p className="mt-3 text-sm italic text-ink-500">
        Остават {attemptsLeft} {attemptsLeft === 1 ? 'опит' : 'опита'}
      </p>

      <div className="mt-10 flex flex-col items-center">
        <CameraCapture
          label="Заснеми отговора"
          description="Снимай какво виждаш — AI ще го оцени."
          onCapture={onCapture}
          disabled={isUploading}
        />
        {isUploading && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-500">
            <Loader2 size={14} className="animate-spin" /> Качване…
          </p>
        )}
      </div>
    </div>
  );
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
