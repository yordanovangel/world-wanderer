import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/hooks/use-toast';
import {
  fetchActiveSession,
  fetchPublicTasks,
  fetchQuest,
  fetchSession,
  fetchSubmissions,
  startSession,
  type PublicTask,
} from '@/lib/queries/quests';

/**
 * Treasure-hunt play screen.
 *  - Shows the AI-generated hint (no reference image).
 *  - Sequential — current task is the first one without a successful match.
 *  - Unlimited attempts.
 */
export default function TreasurePlayPage() {
  const { id: questId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session');
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [bootstrapping, setBootstrapping] = useState(false);
  const { upload, isUploading } = useImageUpload('task_submission');

  useEffect(() => {
    if (!questId || !user || sessionId) return;
    let cancelled = false;
    (async () => {
      setBootstrapping(true);
      try {
        const active = await fetchActiveSession(questId, user.id);
        if (active && active.status === 'in_progress') {
          if (!cancelled) setSessionId(active.id);
          return;
        }
        const { session_id } = await startSession(questId);
        if (!cancelled) setSessionId(session_id);
      } catch (e: any) {
        toast({ title: 'Не успяхме да заредим сесията', description: e?.message, variant: 'destructive' });
        navigate(`/quest/${questId}/intro`, { replace: true });
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, [questId, user, sessionId, navigate]);

  const questQ = useQuery({
    queryKey: ['quest', questId],
    queryFn: () => fetchQuest(questId!),
    enabled: !!questId,
  });
  const tasksQ = useQuery({
    queryKey: ['quest-tasks', questId],
    queryFn: () => fetchPublicTasks(questId!),
    enabled: !!questId,
  });
  const sessionQ = useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => fetchSession(sessionId!),
    enabled: !!sessionId,
  });
  const submissionsQ = useQuery({
    queryKey: ['submissions', sessionId],
    queryFn: () => fetchSubmissions(sessionId!),
    enabled: !!sessionId,
  });

  const orderedTasks: PublicTask[] = useMemo(() => {
    if (!tasksQ.data) return [];
    const order = sessionQ.data?.task_order;
    const byId = new Map(tasksQ.data.map((t) => [t.id, t]));
    if (order && order.length > 0) {
      const out: PublicTask[] = [];
      for (const id of order) {
        const t = byId.get(id);
        if (t) out.push(t);
      }
      return out;
    }
    return [...tasksQ.data].sort((a, b) => a.order_idx - b.order_idx);
  }, [tasksQ.data, sessionQ.data]);

  const matchedIds = useMemo(() => {
    const set = new Set<string>();
    for (const s of submissionsQ.data ?? []) {
      // Treasure submissions store match in is_match — we approximate via score>=10
      if ((s.score ?? 0) >= 10) set.add(s.task_id);
    }
    return set;
  }, [submissionsQ.data]);

  const currentIndex = useMemo(() => {
    if (orderedTasks.length === 0) return 0;
    const idx = orderedTasks.findIndex((t) => !matchedIds.has(t.id));
    return idx === -1 ? orderedTasks.length - 1 : idx;
  }, [orderedTasks, matchedIds]);

  // Auto-route to complete when all matched
  useEffect(() => {
    if (!sessionId || orderedTasks.length === 0) return;
    const allDone = orderedTasks.every((t) => matchedIds.has(t.id));
    if (allDone || sessionQ.data?.status === 'completed') {
      navigate(`/quest/${questId}/complete?session=${sessionId}`, { replace: true });
    }
  }, [orderedTasks, matchedIds, sessionId, questId, navigate, sessionQ.data]);

  const isLoading =
    bootstrapping || questQ.isLoading || tasksQ.isLoading || sessionQ.isLoading || submissionsQ.isLoading;

  if (isLoading || !questId || !sessionId || orderedTasks.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      </div>
    );
  }

  const currentTask = orderedTasks[currentIndex];
  const total = orderedTasks.length;

  const onCapture = async (blob: Blob) => {
    try {
      const { storage_path } = await upload(blob, {
        session_id: sessionId,
        task_id: currentTask.id,
      });
      navigate(
        `/quest/${questId}/treasure-scoring?session=${sessionId}&task=${currentTask.id}&path=${encodeURIComponent(storage_path)}`,
      );
    } catch (e: any) {
      toast({ title: 'Не успяхме да качим снимката', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <Link to="/home" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <ArrowLeft size={16} /> Назад
        </Link>
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
          Задача {currentIndex + 1}/{total}
        </span>
      </div>

      <article className="mt-5 rounded-2xl border-l-4 border-terracotta-500 bg-parchment-50 p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Подсказка</p>
        <p className="mt-2 text-base leading-relaxed text-ink-900">{currentTask.description}</p>
      </article>

      <p className="mt-3 text-sm italic text-ink-500">Намери обекта и го снимай. Опитите са неограничени.</p>

      <div className="mt-10 flex flex-col items-center">
        <CameraCapture
          label="Снимай находката"
          description="AI ще сравни с референцията."
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
