import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, LogOut, Moon, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchUserStats, fetchCreatedQuestsAll } from '@/lib/queries/history';
import { initials } from '@/lib/format';
import { ModeIcon, MODE_LABEL } from '@/components/home/ModeIcon';
import { toast } from '@/hooks/use-toast';

const APP_VERSION = 'v0.8.0';

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<{ played: number; created: number; totalScore: number } | null>(
    null,
  );
  const [created, setCreated] = useState<Awaited<ReturnType<typeof fetchCreatedQuestsAll>>>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, c] = await Promise.all([
          fetchUserStats(user.id),
          fetchCreatedQuestsAll(user.id),
        ]);
        if (cancelled) return;
        setStats(s);
        setCreated(c);
      } catch (e: any) {
        toast({
          title: 'Не успяхме да заредим профила',
          description: e?.message,
          variant: 'destructive',
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleClearLocal = () => {
    if (!confirm('Сигурен ли си? Това ще изтрие чернови и draft tokens.')) return;
    Object.keys(localStorage)
      .filter((k) => k.startsWith('rq_') && k !== 'rq_auth_token' && k !== 'rq_auth_user')
      .forEach((k) => localStorage.removeItem(k));
    toast({ title: 'Локалните данни са изчистени' });
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const recentCreated = created.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <h1 className="font-display text-[28px] leading-tight text-ink-900">Профил</h1>

      {/* Identity */}
      <section className="mt-6 flex items-center gap-4 rounded-2xl border border-parchment-200 bg-white p-5 shadow-soft">
        <div className="flex h-16 w-16 flex-none items-center justify-center rounded-full bg-ochre-700 font-display text-2xl text-parchment-50">
          {initials(user?.nickname)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-xl text-ink-900">
            {user?.nickname || 'Без прякор'}
          </p>
          <p className="mt-0.5 font-mono-rq text-[11px] text-ink-300">
            {user?.id.slice(0, 8)}
          </p>
        </div>
      </section>

      {/* Stats */}
      {stats && (
        <section className="mt-3 grid grid-cols-3 gap-2 rounded-2xl border border-parchment-200 bg-white p-4 shadow-soft">
          <div className="text-center">
            <p className="font-mono-rq text-2xl font-semibold text-ink-900">{stats.played}</p>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">Играни</p>
          </div>
          <div className="text-center">
            <p className="font-mono-rq text-2xl font-semibold text-ink-900">{stats.created}</p>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">Създадени</p>
          </div>
          <div className="text-center">
            <p className="font-mono-rq text-2xl font-semibold text-ink-900">
              {stats.totalScore}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-ink-500">XP</p>
          </div>
        </section>
      )}

      {/* My quests */}
      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-500">
            Моите quest-ове
          </h2>
          <Link to="/profile/created" className="text-xs text-terracotta-500 hover:text-terracotta-700">
            Виж всички →
          </Link>
        </div>
        {recentCreated.length === 0 ? (
          <p className="rounded-xl border border-parchment-200 bg-white p-4 text-center text-sm text-ink-500">
            Още не си създал quest.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentCreated.map((q) => (
              <li key={q.id}>
                <Link
                  to={
                    q.status === 'draft' && q.mode === 'treasure_hunt'
                      ? `/create/treasure/wizard?quest=${q.id}`
                      : `/quest/${q.id}/leaderboard`
                  }
                  className="flex items-center gap-3 rounded-xl border border-parchment-200 bg-white p-3 shadow-soft hover:bg-parchment-100"
                >
                  <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-parchment-100 text-forest-700">
                    <ModeIcon mode={q.mode} size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{q.title}</p>
                    <p className="text-xs text-ink-500">
                      {MODE_LABEL[q.mode]} ·{' '}
                      {q.status === 'draft' ? 'Чернова' : q.status === 'archived' ? 'Архив' : 'Публикуван'}
                    </p>
                  </div>
                  {q.status === 'draft' ? (
                    <span className="text-xs font-medium text-terracotta-500">
                      Продължи →
                    </span>
                  ) : (
                    <ChevronRight size={16} className="text-ink-300" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Settings */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-ink-500">
          Настройки
        </h2>
        <ul className="space-y-1.5">
          <li>
            <button
              type="button"
              onClick={() =>
                toast({
                  title: 'Тъмна тема — скоро',
                  description: 'Работим по нея.',
                })
              }
              className="flex w-full items-center gap-3 rounded-xl border border-parchment-200 bg-white p-3.5 text-left shadow-soft hover:bg-parchment-100"
            >
              <Moon size={18} className="text-ink-500" />
              <span className="flex-1 text-sm text-ink-900">Тъмна тема (вечер)</span>
              <span className="text-[11px] uppercase tracking-wider text-ink-300">Скоро</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={handleClearLocal}
              className="flex w-full items-center gap-3 rounded-xl border border-parchment-200 bg-white p-3.5 text-left shadow-soft hover:bg-parchment-100"
            >
              <Trash2 size={18} className="text-ink-500" />
              <span className="flex-1 text-sm text-ink-900">Изчисти локални данни</span>
            </button>
          </li>
          <li>
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl border border-danger-200 bg-white p-3.5 text-left shadow-soft hover:bg-danger-200/30"
            >
              <LogOut size={18} className="text-danger-600" />
              <span className="flex-1 text-sm font-medium text-danger-600">Излез</span>
            </button>
          </li>
        </ul>
        <p className="mt-6 text-center font-mono-rq text-[11px] text-ink-300">
          Reality Quest {APP_VERSION}
        </p>
      </section>
    </div>
  );
}
