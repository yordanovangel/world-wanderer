import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Share2, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchSession, fetchSubmissions, fetchQuest, fetchPublicTasks, type Submission, type PublicTask, type Session, type Quest } from '@/lib/queries/quests';
import { fetchQuestLeaderboard, signDownloadUrls, type LeaderboardRow } from '@/lib/queries/history';
import { ModeIcon, MODE_LABEL } from '@/components/home/ModeIcon';
import { formatDuration } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { ShareModal } from '@/components/ShareModal';

const STATUS_LABEL: Record<Session['status'], string> = {
  in_progress: 'В ход',
  completed: 'Завършен',
  abandoned: 'Изоставен',
  expired: 'Изтекъл',
};

const STATUS_CLASS: Record<Session['status'], string> = {
  in_progress: 'bg-ochre-200 text-ochre-700',
  completed: 'bg-forest-200 text-forest-700',
  abandoned: 'bg-parchment-200 text-ink-500',
  expired: 'bg-danger-200 text-danger-600',
};

function fmtTimestamp(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('bg-BG', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [session, setSession] = useState<Session | null>(null);
  const [quest, setQuest] = useState<Quest | null>(null);
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({}); // submission_id -> signed url
  const [leaderboard, setLeaderboard] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const s = await fetchSession(id);
        if (!s) {
          toast({ title: 'Сесията не е намерена', variant: 'destructive' });
          return;
        }
        if (cancelled) return;
        setSession(s);
        const [q, ts, subs, lb] = await Promise.all([
          fetchQuest(s.quest_id),
          fetchPublicTasks(s.quest_id),
          fetchSubmissions(s.id),
          fetchQuestLeaderboard(s.quest_id).catch(() => []),
        ]);
        if (cancelled) return;
        setQuest(q);
        setTasks(ts);
        setSubmissions(subs);
        setLeaderboard(lb);

        // Sign thumbnails for the best submission per task
        const bestPerTask = new Map<string, Submission>();
        for (const sub of subs) {
          const prev = bestPerTask.get(sub.task_id);
          if (!prev) bestPerTask.set(sub.task_id, sub);
          else if ((sub.score ?? 0) > (prev.score ?? 0)) bestPerTask.set(sub.task_id, sub);
        }
        const paths = Array.from(bestPerTask.values()).map((b) => b.storage_path);
        if (paths.length > 0) {
          try {
            const urls = await signDownloadUrls({ bucket: 'task-submissions', paths });
            if (cancelled) return;
            const map: Record<string, string> = {};
            Array.from(bestPerTask.values()).forEach((b, i) => {
              map[b.id] = urls[i];
            });
            setThumbs(map);
          } catch {
            /* thumbnails are non-critical */
          }
        }
      } catch (e: any) {
        toast({
          title: 'Не успяхме да заредим сесията',
          description: e?.message,
          variant: 'destructive',
        });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const bestByTask = useMemo(() => {
    const map = new Map<string, Submission>();
    for (const sub of submissions) {
      const prev = map.get(sub.task_id);
      if (!prev) map.set(sub.task_id, sub);
      else if ((sub.score ?? 0) > (prev.score ?? 0)) map.set(sub.task_id, sub);
    }
    return map;
  }, [submissions]);

  const attemptsByTask = useMemo(() => {
    const map = new Map<string, number>();
    for (const sub of submissions) {
      map.set(sub.task_id, Math.max(map.get(sub.task_id) ?? 0, sub.attempt_no));
    }
    return map;
  }, [submissions]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-ink-500">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }
  if (!session || !quest) return null;

  const isTreasure = quest.mode === 'treasure_hunt';
  const totalScore = Array.from(bestByTask.values()).reduce(
    (sum, s) => sum + (s.score ?? 0),
    0,
  );
  const duration = session.completed_at
    ? Math.max(
        0,
        Math.floor(
          (new Date(session.completed_at).getTime() -
            new Date(session.started_at).getTime()) /
            1000,
        ),
      )
    : 0;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to="/history"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Назад към история
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-2xl leading-tight text-ink-900">{quest.title}</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-500">
          <ModeIcon mode={quest.mode} size={14} /> {MODE_LABEL[quest.mode]}
        </p>
      </header>

      {/* Summary */}
      <section className="mt-5 rounded-2xl border border-parchment-200 bg-white p-5 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_CLASS[session.status]}`}
          >
            {STATUS_LABEL[session.status]}
          </span>
          <div className="text-right">
            {isTreasure ? (
              <p className="font-mono-rq text-2xl font-semibold text-ink-900">
                {formatDuration(duration)}
              </p>
            ) : (
              <p className="font-mono-rq text-2xl font-semibold text-ink-900">
                {totalScore}{' '}
                <span className="text-base font-normal text-ink-500">т.</span>
              </p>
            )}
          </div>
        </div>
        <dl className="mt-4 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-500">Започната</dt>
            <dd className="font-mono-rq text-ink-700">{fmtTimestamp(session.started_at)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-500">Завършена</dt>
            <dd className="font-mono-rq text-ink-700">
              {fmtTimestamp(session.completed_at)}
            </dd>
          </div>
        </dl>
      </section>

      {quest.creator_id === user?.id && quest.share_token && (
        <button
          type="button"
          onClick={() => setShowShare(true)}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-forest-700 bg-white px-4 text-sm font-semibold text-forest-700 shadow-soft hover:bg-parchment-100"
        >
          <Share2 size={16} /> Сподели quest-а
        </button>
      )}

      {/* Per-task breakdown */}
      <section className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-ink-500">
          Задачи
        </h2>
        <ul className="space-y-2.5">
          {tasks.map((t, i) => {
            const best = bestByTask.get(t.id);
            const attempts = attemptsByTask.get(t.id) ?? 0;
            const thumb = best ? thumbs[best.id] : undefined;
            return (
              <li
                key={t.id}
                className="flex gap-3 rounded-2xl border border-parchment-200 bg-white p-3 shadow-soft"
              >
                <div className="h-16 w-16 flex-none overflow-hidden rounded-xl bg-parchment-100">
                  {thumb ? (
                    <img
                      src={thumb}
                      alt={`Задача ${i + 1}`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-ink-300">
                      —
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {i + 1}. {t.title}
                    </p>
                    {best ? (
                      isTreasure ? (
                        <span className="flex-none rounded-full bg-forest-200 px-2 py-0.5 text-[11px] font-medium text-forest-700">
                          ✓ Намерено
                        </span>
                      ) : (
                        <span className="flex-none font-mono-rq text-sm font-semibold text-ink-900">
                          {best.score ?? 0}/{t.max_points}
                        </span>
                      )
                    ) : (
                      <span className="flex-none text-[11px] text-ink-300">—</span>
                    )}
                  </div>
                  {best?.ai_reasoning && (
                    <p className="mt-1 line-clamp-2 text-xs text-ink-500">
                      {best.ai_reasoning}
                    </p>
                  )}
                  {attempts > 1 && (
                    <span className="mt-1.5 inline-block rounded-full bg-parchment-100 px-2 py-0.5 text-[10px] font-medium text-ink-500">
                      {attempts} опита
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Leaderboard */}
      {leaderboard.length > 1 && (
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-ink-500">
            <Trophy size={14} /> Класиране
          </h2>
          <ul className="space-y-1.5">
            {leaderboard.slice(0, 10).map((row) => {
              const me = row.player_id === user?.id;
              return (
                <li
                  key={row.session_id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    me
                      ? 'border-terracotta-500 bg-parchment-50 shadow-soft'
                      : 'border-parchment-200 bg-white'
                  }`}
                >
                  <span className="w-6 flex-none text-center font-mono-rq text-sm font-semibold text-ink-700">
                    {row.rank ?? '—'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
                    {row.nickname || 'Анонимен'}
                    {me && (
                      <span className="ml-1.5 text-[11px] text-terracotta-500">(ти)</span>
                    )}
                  </span>
                  <span className="font-mono-rq text-sm text-ink-700">
                    {isTreasure
                      ? formatDuration(row.duration_sec ?? 0)
                      : `${row.total_score} т.`}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
