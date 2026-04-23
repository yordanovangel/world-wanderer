import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { invokeFn } from '@/lib/fn';
import { scoreSubmission } from '@/lib/queries/quests';

const SUBMISSION_BUCKET = 'task-submissions';

type ScoreResp = {
  score: number;
  reasoning: string;
  fraud_suspected: boolean;
  attempt_no: number;
  is_last_attempt: boolean;
  session_completed: boolean;
};

/**
 * Transient screen: show the user's submitted photo with a sweep animation
 * while we call the score-submission edge function in the background.
 * Then navigate to the result screen.
 */
export default function QuestScoringPage() {
  const { id: questId } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const sessionId = search.get('session') || '';
  const taskId = search.get('task') || '';
  const submissionPath = search.get('path') || '';
  const navigate = useNavigate();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId || !taskId || !submissionPath || !questId) {
      setError('Липсват данни за оценяване');
      return;
    }
    (async () => {
      try {
        // Sign download URL for the just-uploaded submission so we can preview it
        const signResp = await invokeFn<{ urls: string[] }>('sign-download-urls', {
          bucket: SUBMISSION_BUCKET,
          paths: [submissionPath],
          ttl_sec: 600,
        });
        if (cancelled) return;
        if (signResp.urls?.[0]) setPreviewUrl(signResp.urls[0]);

        // Kick off scoring (don't block on preview being shown)
        const result: ScoreResp = await scoreSubmission({
          session_id: sessionId,
          task_id: taskId,
          submission_path: submissionPath,
        });
        if (cancelled) return;

        const params = new URLSearchParams({
          session: sessionId,
          task: taskId,
          score: String(result.score),
          attempt: String(result.attempt_no),
          last: result.is_last_attempt ? '1' : '0',
          done: result.session_completed ? '1' : '0',
          reasoning: result.reasoning,
        });
        navigate(`/quest/${questId}/result?${params.toString()}`, { replace: true });
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Грешка при оценяване');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questId, sessionId, taskId, submissionPath, navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-parchment-50">
      <div className="relative flex-1 overflow-hidden bg-ink-900">
        {previewUrl && (
          <img
            src={previewUrl}
            alt="Твоята снимка"
            className="absolute inset-0 h-full w-full object-contain"
          />
        )}
        {!error && (
          <div
            className="pointer-events-none absolute left-0 right-0 h-1.5 bg-terracotta-500/90 shadow-[0_0_24px_rgba(217,118,63,0.6)]"
            style={{ animation: 'rq-scan 1500ms ease-in-out infinite' }}
          />
        )}
        <style>{`
          @keyframes rq-scan {
            0% { bottom: 0%; opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { bottom: 100%; opacity: 0; }
          }
        `}</style>
      </div>

      <div className="flex flex-col items-center gap-2 bg-parchment-50 px-6 py-8 text-center">
        <Compass size={28} className="text-terracotta-500" />
        {error ? (
          <>
            <p className="font-display text-xl text-danger-600">{error}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-3 rounded-xl border border-parchment-200 bg-white px-4 py-2 text-sm font-medium text-ink-900 hover:bg-parchment-100"
            >
              Назад
            </button>
          </>
        ) : (
          <p className="font-display text-xl text-ink-700">Изследвам снимката…</p>
        )}
      </div>
    </div>
  );
}
