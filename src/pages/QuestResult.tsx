import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SOLO_PASS_SCORE, SOLO_MAX_ATTEMPTS } from '@/lib/quest-progress';

export default function QuestResultPage() {
  const { id: questId } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const sessionId = search.get('session') || '';
  const taskId = search.get('task') || '';
  const score = parseInt(search.get('score') || '0', 10);
  const attemptNo = parseInt(search.get('attempt') || '1', 10);
  const isLastAttempt = search.get('last') === '1';
  const sessionDone = search.get('done') === '1';
  const reasoning = search.get('reasoning') || '';

  const passed = score >= SOLO_PASS_SCORE;
  const canRetry = !passed && !isLastAttempt;
  const variant: 'success' | 'retry' | 'final' = passed ? 'success' : canRetry ? 'retry' : 'final';

  const continueTo = sessionDone
    ? `/quest/${questId}/complete?session=${sessionId}`
    : `/quest/${questId}/play?session=${sessionId}`;

  return (
    <div className={`fixed inset-0 z-40 flex flex-col ${variant === 'success' ? 'bg-forest-200/60' : 'bg-terracotta-200/60'}`}>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {variant === 'success'
          ? <CheckCircle2 size={64} className="text-forest-500" strokeWidth={1.5} />
          : <AlertCircle size={64} className="text-terracotta-500" strokeWidth={1.5} />}

        <h1 className="font-display text-ink-900" style={{ fontSize: variant === 'success' ? 32 : 28 }}>
          {variant === 'success' && t('quest.result.found')}
          {variant === 'retry' && t('quest.result.notQuite')}
          {variant === 'final' && t('quest.result.thisRemains', { score })}
        </h1>

        {variant === 'success' && <CountUpScore target={score} />}

        {reasoning && <p className="max-w-prose text-sm italic text-ink-700">{reasoning}</p>}

        {variant === 'retry' && (
          <p className="mt-1 font-mono-rq text-xs text-ink-500">
            {t('quest.result.current', { score, attempt: attemptNo, max: SOLO_MAX_ATTEMPTS })}
          </p>
        )}

        <div className="mt-6 w-full space-y-3">
          {variant === 'retry' ? (
            <>
              <button type="button"
                onClick={() => navigate(`/quest/${questId}/play?session=${sessionId}`, { replace: true })}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700">
                <RotateCcw size={18} /> {t('quest.result.tryAgain')}
              </button>
              <button type="button" onClick={() => navigate(continueTo, { replace: true })}
                className="flex h-12 w-full items-center justify-center rounded-xl border border-forest-700 bg-white px-4 text-base font-semibold text-forest-700 hover:bg-forest-200/40">
                {t('quest.result.acceptScore', { score })}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => navigate(continueTo, { replace: true })}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700">
              {sessionDone ? t('quest.result.toResult') : t('quest.result.continue')} <ArrowRight size={18} />
            </button>
          )}
          <Link to="/home" className="block py-2 text-center text-sm text-ink-500 hover:text-ink-900">
            {t('quest.result.exit')}
          </Link>
        </div>
        <p className="hidden">{taskId}</p>
      </div>
    </div>
  );
}

function CountUpScore({ target }: { target: number }) {
  const { t } = useTranslation();
  const [n, setN] = useState(0);
  const duration = 800;
  useMemo(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const tt = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - tt, 3);
      setN(Math.round(target * eased));
      if (tt < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  useEffect(() => () => undefined, []);
  return <p className="font-display text-[36px] leading-none text-ochre-700">{t('quest.result.scoreSuffix', { n })}</p>;
}
