import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CameraCapture } from '@/components/CameraCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/hooks/use-toast';
import {
  abandonSession, fetchActiveSession, fetchPublicTasks, fetchQuest,
  fetchSession, fetchSubmissions, startSession,
} from '@/lib/queries/quests';
import { computeProgress, SOLO_MAX_ATTEMPTS } from '@/lib/quest-progress';

export default function QuestPlayPage() {
  const { id: questId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const initialSessionId = searchParams.get('session');
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const queryClient = useQueryClient();
  const { upload, isUploading } = useImageUpload('task_submission');

  const onAbandon = async () => {
    if (!sessionId) return;
    setAbandoning(true);
    try {
      await abandonSession(sessionId);
      await queryClient.invalidateQueries({ queryKey: ['home'] });
      await queryClient.invalidateQueries({ queryKey: ['history'] });
      toast({ title: t('quest.play.abandonedToast') });
      navigate('/home', { replace: true });
    } catch (e: any) {
      toast({ title: t('quest.play.abandonFailed'), description: e?.message, variant: 'destructive' });
    } finally {
      setAbandoning(false);
      setConfirmAbandon(false);
    }
  };

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
        toast({ title: t('quest.play.loadFailed'), description: e?.message, variant: 'destructive' });
        navigate(`/quest/${questId}/intro`, { replace: true });
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => { cancelled = true; };
  }, [questId, user, sessionId, navigate, t]);

  const questQ = useQuery({ queryKey: ['quest', questId], queryFn: () => fetchQuest(questId!), enabled: !!questId });
  const tasksQ = useQuery({ queryKey: ['quest-tasks', questId], queryFn: () => fetchPublicTasks(questId!), enabled: !!questId });
  const sessionQ = useQuery({ queryKey: ['session', sessionId], queryFn: () => fetchSession(sessionId!), enabled: !!sessionId });
  const submissionsQ = useQuery({ queryKey: ['submissions', sessionId], queryFn: () => fetchSubmissions(sessionId!), enabled: !!sessionId });

  const progress = useMemo(() => {
    if (!tasksQ.data || !submissionsQ.data) return null;
    return computeProgress(tasksQ.data, submissionsQ.data, sessionQ.data?.task_order ?? null);
  }, [tasksQ.data, submissionsQ.data, sessionQ.data]);

  useEffect(() => {
    if (!sessionId || !progress) return;
    if (progress.isComplete || sessionQ.data?.status === 'completed') {
      navigate(`/quest/${questId}/complete?session=${sessionId}`, { replace: true });
    }
  }, [progress, sessionQ.data, sessionId, questId, navigate]);

  const isLoading =
    bootstrapping || questQ.isLoading || tasksQ.isLoading || sessionQ.isLoading || submissionsQ.isLoading;

  if (isLoading || !progress || !questId || !sessionId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      </div>
    );
  }

  const total = progress.states.length;
  const currentState = progress.states[progress.currentIndex];
  const currentTask = currentState.task;
  const attemptsLeft = SOLO_MAX_ATTEMPTS - currentState.attempts.length;

  const onCapture = async (blob: Blob) => {
    try {
      const { storage_path } = await upload(blob, { session_id: sessionId, task_id: currentTask.id });
      navigate(`/quest/${questId}/scoring?session=${sessionId}&task=${currentTask.id}&path=${encodeURIComponent(storage_path)}`);
    } catch (e: any) {
      toast({ title: t('quest.play.uploadFailed'), description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <Link to="/home" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <ArrowLeft size={16} /> {t('quest.play.back')}
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-500">
            {t('quest.play.taskShort', { current: progress.currentIndex + 1, total })}
          </span>
          <button
            type="button"
            onClick={() => setConfirmAbandon(true)}
            className="inline-flex h-9 min-w-[44px] items-center gap-1 rounded-lg px-2 text-xs font-medium text-ink-500 hover:bg-parchment-100 hover:text-danger-600"
            aria-label={t('quest.play.abandonAria')}
          >
            <X size={14} /> {t('quest.play.abandon')}
          </button>
        </div>
      </div>

      <article className="mt-5 rounded-2xl border-l-4 border-terracotta-500 bg-parchment-50 p-5 shadow-soft">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
          {t('quest.play.taskNumber', { n: currentTask.order_idx })}
        </p>
        <h1 className="mt-1 font-display text-[24px] leading-tight text-ink-900">{currentTask.title}</h1>
        <p className="mt-2 max-w-prose text-base text-ink-700">{currentTask.description}</p>
      </article>

      <p className="mt-3 text-sm italic text-ink-500">
        {t('quest.play.attemptsLeft', { count: attemptsLeft })}
      </p>

      <div className="mt-10 flex flex-col items-center">
        <CameraCapture
          label={t('quest.play.captureLabel')}
          description={t('quest.play.captureDesc')}
          onCapture={onCapture}
          disabled={isUploading}
        />
        {isUploading && (
          <p className="mt-3 inline-flex items-center gap-2 text-sm text-ink-500">
            <Loader2 size={14} className="animate-spin" /> {t('quest.play.uploading')}
          </p>
        )}
      </div>

      <AlertDialog open={confirmAbandon} onOpenChange={setConfirmAbandon}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('quest.play.abandonDialogTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('quest.play.abandonDialogDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={abandoning}>{t('quest.play.abandonDialogCancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); onAbandon(); }}
              disabled={abandoning}
              className="bg-danger-600 text-parchment-50 hover:bg-danger-600/90"
            >
              {abandoning ? t('quest.play.abandoning') : t('quest.play.abandonDialogConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
