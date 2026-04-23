import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchSessionsPage, type SessionStatusFilter } from '@/lib/queries/history';
import type { SessionSummary } from '@/lib/queries/home';
import { ModeIcon } from '@/components/home/ModeIcon';
import { formatDuration } from '@/lib/format';
import { toast } from '@/hooks/use-toast';
import { EmptyState } from '@/components/EmptyState';

const PAGE_SIZE = 20;

const TABS: { key: SessionStatusFilter; label: string }[] = [
  { key: 'all', label: 'Всички' },
  { key: 'completed', label: 'Завършени' },
  { key: 'in_progress', label: 'В процес' },
  { key: 'expired', label: 'Изтекли' },
];

const STATUS_LABEL: Record<SessionSummary['status'], string> = {
  in_progress: 'В ход',
  completed: 'Завършен',
  abandoned: 'Изоставен',
  expired: 'Изтекъл',
};

const STATUS_CLASS: Record<SessionSummary['status'], string> = {
  in_progress: 'bg-ochre-200 text-ochre-700',
  completed: 'bg-forest-200 text-forest-700',
  abandoned: 'bg-parchment-200 text-ink-500',
  expired: 'bg-danger-200 text-danger-600',
};

function SessionRow({ s }: { s: SessionSummary }) {
  const showScore = s.mode !== 'treasure_hunt' && s.status === 'completed';
  return (
    <Link
      to={`/session/${s.session_id}/detail`}
      className="flex items-center gap-3 rounded-2xl border border-parchment-200 bg-white p-4 shadow-soft transition hover:bg-parchment-100"
    >
      <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-parchment-100 text-forest-700">
        <ModeIcon mode={s.mode} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[17px] leading-tight text-ink-900">
          {s.quest_title}
        </p>
        <span
          className={`mt-1.5 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[s.status]}`}
        >
          {STATUS_LABEL[s.status]}
        </span>
      </div>
      <div className="text-right font-mono-rq text-sm text-ink-700">
        {showScore
          ? `${s.total_score} т.`
          : s.status === 'completed'
            ? formatDuration(s.duration_sec)
            : `${s.submitted_tasks}/${s.total_tasks}`}
      </div>
    </Link>
  );
}

export default function HistoryPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<SessionStatusFilter>('all');
  const [items, setItems] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setItems([]);
    setHasMore(true);
    setLoading(true);
    fetchSessionsPage(user.id, filter, 0, PAGE_SIZE)
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setHasMore(rows.length === PAGE_SIZE);
      })
      .catch((e) =>
        toast({
          title: 'Не успяхме да заредим историята',
          description: e?.message,
          variant: 'destructive',
        }),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user, filter]);

  const loadMore = async () => {
    if (!user || loading) return;
    setLoading(true);
    try {
      const next = await fetchSessionsPage(user.id, filter, items.length, PAGE_SIZE);
      setItems((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (e: any) {
      toast({
        title: 'Не успяхме да заредим още',
        description: e?.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <header>
        <h1 className="font-display text-[28px] leading-tight text-ink-900">Моите игри</h1>
      </header>

      {/* Filter tabs */}
      <nav className="mt-5 flex gap-2 overflow-x-auto pb-1" aria-label="Филтър">
        {TABS.map((t) => {
          const active = t.key === filter;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`flex-none rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-terracotta-500 text-parchment-50 shadow-soft'
                  : 'bg-white text-ink-700 ring-1 ring-parchment-200 hover:bg-parchment-100'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      {/* List */}
      <section className="mt-6 space-y-2.5">
        {items.length === 0 && !loading && (
          <EmptyState
            variant="no-quests"
            action={
              <Link
                to="/create"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-terracotta-500 px-5 text-sm font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
              >
                Нов quest
              </Link>
            }
          />
        )}
        {items.map((s) => (
          <SessionRow key={s.session_id} s={s} />
        ))}
        {loading && (
          <div className="flex justify-center py-4 text-ink-500">
            <Loader2 size={20} className="animate-spin" />
          </div>
        )}
        {!loading && hasMore && items.length > 0 && (
          <button
            type="button"
            onClick={loadMore}
            className="mt-2 flex h-11 w-full items-center justify-center rounded-xl border border-parchment-200 bg-white text-sm font-medium text-ink-700 hover:bg-parchment-100"
          >
            Зареди още
          </button>
        )}
      </section>
    </div>
  );
}
