import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchCreatedQuestsAll } from '@/lib/queries/history';
import { ModeIcon, MODE_LABEL } from '@/components/home/ModeIcon';
import { toast } from '@/hooks/use-toast';

const STATUS_LABEL: Record<'draft' | 'published' | 'archived', string> = {
  draft: 'Чернова',
  published: 'Публикуван',
  archived: 'Архив',
};

const STATUS_CLASS: Record<'draft' | 'published' | 'archived', string> = {
  draft: 'bg-ochre-200 text-ochre-700',
  published: 'bg-forest-200 text-forest-700',
  archived: 'bg-parchment-200 text-ink-500',
};

export default function ProfileCreatedPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Awaited<ReturnType<typeof fetchCreatedQuestsAll>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchCreatedQuestsAll(user.id)
      .then((rows) => !cancelled && setItems(rows))
      .catch((e) =>
        toast({
          title: 'Не успяхме да заредим quest-овете',
          description: e?.message,
          variant: 'destructive',
        }),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to="/profile"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Назад към профил
      </Link>

      <h1 className="mt-4 font-display text-[28px] leading-tight text-ink-900">
        Моите quest-ове
      </h1>

      {loading ? (
        <div className="mt-10 flex justify-center text-ink-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-parchment-200 bg-white p-8 text-center shadow-soft">
          <p className="text-base text-ink-700">Още не си създал quest.</p>
          <Link
            to="/create"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-xl bg-terracotta-500 px-5 text-sm font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
          >
            Създай quest
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5">
          {items.map((q) => {
            const isDraft = q.status === 'draft';
            const linkTo = isDraft
              ? q.mode === 'treasure_hunt'
                ? `/create/treasure/wizard?quest=${q.id}`
                : `/create`
              : `/quest/${q.id}/leaderboard`;
            return (
              <li key={q.id}>
                <Link
                  to={linkTo}
                  className="flex items-center gap-3 rounded-2xl border border-parchment-200 bg-white p-4 shadow-soft hover:bg-parchment-100"
                >
                  <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-parchment-100 text-forest-700">
                    <ModeIcon mode={q.mode} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[17px] leading-tight text-ink-900">
                      {q.title}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[q.status]}`}
                      >
                        {STATUS_LABEL[q.status]}
                      </span>
                      <span className="text-xs text-ink-500">{MODE_LABEL[q.mode]}</span>
                    </div>
                  </div>
                  {isDraft ? (
                    <span className="flex-none text-xs font-medium text-terracotta-500">
                      Продължи →
                    </span>
                  ) : (
                    <ChevronRight size={16} className="flex-none text-ink-300" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
