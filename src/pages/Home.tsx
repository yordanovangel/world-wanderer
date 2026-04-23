import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Settings, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { initials } from '@/lib/format';
import {
  fetchInProgressSessions,
  fetchPastSessions,
  fetchCreatedQuests,
  type SessionSummary,
  type CreatedQuest,
} from '@/lib/queries/home';
import { InProgressCard } from '@/components/home/InProgressCard';
import { PastSessionRow } from '@/components/home/PastSessionRow';
import { CreatedQuestRow } from '@/components/home/CreatedQuestRow';
import { SectionError } from '@/components/home/SectionError';
import { HorizontalSkeletons, RowSkeletons } from '@/components/home/Skeletons';

type Status = 'loading' | 'ok' | 'error';

function useResource<T>(
  load: () => Promise<T>,
  deps: unknown[],
): { status: Status; data: T | null; reload: () => void } {
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<T | null>(null);
  const [tick, setTick] = useState(0);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    load()
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setStatus('ok');
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('[home] load failed', e);
        setStatus('error');
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  return { status, data, reload };
}

export default function HomePage() {
  const { user } = useAuth();
  const userId = user?.id ?? '';
  const greeting = user?.nickname?.trim() || 'изследователю';

  const inProgress = useResource<SessionSummary[]>(
    () => (userId ? fetchInProgressSessions(userId) : Promise.resolve([])),
    [userId],
  );
  const past = useResource<SessionSummary[]>(
    () => (userId ? fetchPastSessions(userId) : Promise.resolve([])),
    [userId],
  );
  const created = useResource<CreatedQuest[]>(
    () => (userId ? fetchCreatedQuests(userId) : Promise.resolve([])),
    [userId],
  );

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-parchment-200 bg-parchment-50/95 px-5 py-3 backdrop-blur">
        <div className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ochre-500 text-base font-semibold text-ink-900">
          {initials(user?.nickname)}
        </div>
        <p className="min-w-0 flex-1 truncate text-base font-medium text-ink-900">
          Здрасти, {greeting}
        </p>
        <Link
          to="/profile"
          aria-label="Настройки"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-ink-500 hover:bg-parchment-100 hover:text-ink-900"
        >
          <Settings size={20} />
        </Link>
      </header>

      <div className="space-y-7 px-5 py-5">
        {/* Hero */}
        <section className="rounded-2xl bg-parchment-100 p-5 shadow-card">
          <h1 className="font-display text-2xl text-ink-900">Какво ще откриеш днес?</h1>
          <p className="mt-1 text-sm text-ink-500">
            Започни ново приключение или продължи оставено
          </p>
          <Link
            to="/create"
            className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700"
          >
            <Plus size={18} /> Нов quest
          </Link>
        </section>

        {/* In-progress */}
        {(inProgress.status === 'loading' ||
          inProgress.status === 'error' ||
          (inProgress.data && inProgress.data.length > 0)) && (
          <section>
            <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-ink-500">
              Продължи къде остана
            </h2>
            {inProgress.status === 'loading' && <HorizontalSkeletons />}
            {inProgress.status === 'error' && <SectionError onRetry={inProgress.reload} />}
            {inProgress.status === 'ok' && inProgress.data && inProgress.data.length > 0 && (
              <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {inProgress.data.map((s) => (
                  <InProgressCard key={s.session_id} s={s} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Past sessions */}
        <section>
          <div className="mb-3 flex items-baseline justify-between px-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
              Моите игри
            </h2>
            <Link to="/history" className="text-sm font-medium text-forest-700 hover:underline">
              Виж всички →
            </Link>
          </div>
          {past.status === 'loading' && <RowSkeletons />}
          {past.status === 'error' && <SectionError onRetry={past.reload} />}
          {past.status === 'ok' && past.data && (
            past.data.length === 0 ? (
              <div className="rounded-xl border border-dashed border-parchment-200 bg-white/60 p-5 text-center text-sm text-ink-500">
                Още не си играл никой quest. Натисни „+ Нов quest" да започнеш.
              </div>
            ) : (
              <div className="space-y-2">
                {past.data.map((s) => (
                  <PastSessionRow key={s.session_id} s={s} />
                ))}
              </div>
            )
          )}
        </section>

        {/* Created quests */}
        {(created.status === 'loading' ||
          created.status === 'error' ||
          (created.data && created.data.length > 0)) && (
          <section>
            <div className="mb-3 flex items-baseline justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Моите quest-ове
              </h2>
              <Link
                to="/profile#created"
                className="text-sm font-medium text-forest-700 hover:underline"
              >
                Виж всички →
              </Link>
            </div>
            {created.status === 'loading' && <RowSkeletons />}
            {created.status === 'error' && <SectionError onRetry={created.reload} />}
            {created.status === 'ok' && created.data && created.data.length > 0 && (
              <div className="space-y-2">
                {created.data.map((q) => (
                  <CreatedQuestRow key={q.id} q={q} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
