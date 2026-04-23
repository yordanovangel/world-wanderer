import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Compass, RefreshCcw } from 'lucide-react';
import { invokeFn } from '@/lib/fn';
import { compareTreasureSubmission } from '@/lib/queries/treasure';

const SUBMISSION_BUCKET = 'task-submissions';

type CompareResp = {
  match: boolean;
  user_hint: string;
  attempt_no: number;
  session_completed: boolean;
};

export default function TreasureScoringPage() {
  const { id: questId } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const sessionId = search.get('session') || '';
  const taskId = search.get('task') || '';
  const submissionPath = search.get('path') || '';
  const navigate = useNavigate();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResp | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!sessionId || !taskId || !submissionPath || !questId) {
      setError('Липсват данни за сравнение');
      return;
    }
    (async () => {
      try {
        const signResp = await invokeFn<{ urls: string[] }>('sign-download-urls', {
          bucket: SUBMISSION_BUCKET,
          paths: [submissionPath],
          ttl_sec: 600,
        });
        if (cancelled) return;
        if (signResp.urls?.[0]) setPreviewUrl(signResp.urls[0]);

        const r = await compareTreasureSubmission({
          session_id: sessionId,
          task_id: taskId,
          submission_path: submissionPath,
        });
        if (cancelled) return;
        setResult(r);

        if (r.session_completed) {
          setTimeout(() => {
            navigate(`/quest/${questId}/complete?session=${sessionId}`, { replace: true });
          }, 1600);
        } else if (r.match) {
          setTimeout(() => {
            navigate(`/quest/${questId}/treasure-play?session=${sessionId}`, { replace: true });
          }, 1400);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Грешка при сравнение');
      }
    })();
    return () => { cancelled = true; };
  }, [questId, sessionId, taskId, submissionPath, navigate]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-parchment-50">
      <div className="relative flex-1 overflow-hidden bg-ink-900">
        {previewUrl && (
          <img src={previewUrl} alt="Твоята снимка" className="absolute inset-0 h-full w-full object-contain" />
        )}
        {!error && !result && (
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

      <div className="flex flex-col items-center gap-3 bg-parchment-50 px-6 py-8 text-center">
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
        ) : !result ? (
          <p className="font-display text-xl text-ink-700">Сравнявам снимките…</p>
        ) : result.match ? (
          <>
            <p className="font-display text-2xl text-forest-700">Намерено!</p>
            <p className="text-sm text-ink-500">{result.user_hint}</p>
          </>
        ) : (
          <>
            <p className="font-display text-2xl text-danger-600">Не е това</p>
            <p className="max-w-prose text-sm text-ink-700">{result.user_hint}</p>
            <button
              type="button"
              onClick={() => navigate(`/quest/${questId}/treasure-play?session=${sessionId}`, { replace: true })}
              className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-terracotta-500 px-5 text-sm font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
            >
              <RefreshCcw size={16} /> Опитай пак
            </button>
          </>
        )}
      </div>
    </div>
  );
}
