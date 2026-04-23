import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Sparkles, NotebookPen } from 'lucide-react';
import {
  fetchPublicTasks,
  fetchQuest,
  fetchSession,
  fetchSubmissions,
  type PublicTask,
  type Quest,
  type Submission,
} from '@/lib/queries/quests';
import { computeProgress } from '@/lib/quest-progress';
import { formatDuration } from '@/lib/format';

export default function QuestCompletePage() {
  const { id: questId } = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const sessionId = search.get('session') || '';
  const [quest, setQuest] = useState<Quest | null>(null);
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!questId || !sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const [q, t, session] = await Promise.all([
          fetchQuest(questId),
          fetchPublicTasks(questId),
          fetchSession(sessionId),
        ]);
        const subs = await fetchSubmissions(sessionId);
        if (cancelled) return;
        setQuest(q);
        setTasks(t);
        setSubmissions(subs);
        if (session) {
          const end = session.completed_at ? new Date(session.completed_at) : new Date();
          const start = new Date(session.started_at);
          setDuration(Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [questId, sessionId]);

  const progress = useMemo(() => computeProgress(tasks, submissions), [tasks, submissions]);
  const total = progress.totalScore;
  const max = tasks.reduce((s, t) => s + t.max_points, 0);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pt-10 text-center text-ink-500">
        Зареждане…
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-12 pt-8 rq-grain">
      <header className="text-center">
        <Sparkles size={40} className="mx-auto text-ochre-700" />
        <h1 className="mt-3 font-display text-[40px] leading-tight text-ink-900">
          Quest завършен!
        </h1>
        {quest && <p className="mt-1 text-base text-ink-500">{quest.title}</p>}
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3">
        <Stat label="Резултат" value={`${total}/${max || '—'}`} accent="ochre" />
        <Stat label="Време" value={formatDuration(duration)} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-ink-500">
          По задачи
        </h2>
        <ol className="space-y-2">
          {progress.states.map((s, i) => (
            <li
              key={s.task.id}
              className="flex items-center gap-3 rounded-xl border border-parchment-200 bg-white p-3 shadow-soft"
            >
              <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-parchment-100 font-mono-rq text-xs text-ink-700">
                {i + 1}
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink-900">
                {s.task.title}
              </p>
              <span className="font-mono-rq text-sm text-ink-500">
                {s.bestScore}/{s.task.max_points}
              </span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          disabled
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-forest-700 bg-white px-4 text-base font-semibold text-forest-700 opacity-60"
          title="Скоро"
        >
          Сподели резултата
        </button>
        <Link
          to="/history"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
        >
          <NotebookPen size={18} /> Към моите игри
        </Link>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'ochre';
}) {
  return (
    <div className="rounded-2xl border border-parchment-200 bg-white p-4 text-center shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-[28px] leading-none ${
          accent === 'ochre' ? 'text-ochre-700' : 'text-ink-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}
