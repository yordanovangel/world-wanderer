import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Trophy } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { fetchQuest, type Quest } from '@/lib/queries/quests';
import { fetchQuestLeaderboard, type LeaderboardRow } from '@/lib/queries/history';
import { ModeIcon, MODE_LABEL } from '@/components/home/ModeIcon';
import { formatDuration } from '@/lib/format';
import { toast } from '@/hooks/use-toast';

const STATUS_LABEL: Record<LeaderboardRow['status'], string> = {
  in_progress: 'В ход',
  completed: 'Завършен',
  abandoned: 'Изоставен',
  expired: 'Изтекъл',
};

const MEDAL = ['🥇', '🥈', '🥉'];

export default function QuestLeaderboardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [q, lb] = await Promise.all([fetchQuest(id), fetchQuestLeaderboard(id)]);
        if (cancelled) return;
        setQuest(q);
        setRows(lb);
      } catch (e: any) {
        toast({
          title: 'Не успяхме да заредим класирането',
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

  const isCreator = !!quest && !!user && quest.creator_id === user.id;
  const isTreasure = quest?.mode === 'treasure_hunt';

  // Split creator's own session for treasure hunts
  const { creatorSession, otherRows } = useMemo(() => {
    if (!isTreasure || !quest) return { creatorSession: null, otherRows: rows };
    const own = rows.find((r) => r.player_id === quest.creator_id) ?? null;
    return {
      creatorSession: own,
      otherRows: rows.filter((r) => r.player_id !== quest.creator_id),
    };
  }, [rows, quest, isTreasure]);

  const top10 = otherRows.slice(0, 10);
  const myRow = user ? otherRows.find((r) => r.player_id === user.id) : undefined;
  const myInTop = myRow && top10.some((r) => r.session_id === myRow.session_id);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-ink-500">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }
  if (!quest) return null;

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to={isCreator ? '/profile/created' : '/history'}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Назад
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-2xl leading-tight text-ink-900">{quest.title}</h1>
        <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-500">
          <ModeIcon mode={quest.mode} size={14} /> {MODE_LABEL[quest.mode]}
        </p>
      </header>

      <h2 className="mt-6 mb-3 flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-ink-500">
        <Trophy size={14} /> Класиране ({otherRows.length})
      </h2>

      {/* Creator's own session — separate */}
      {isTreasure && creatorSession && (
        <div className="mb-4 rounded-2xl border border-ochre-700 bg-ochre-200/40 p-4 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-ochre-700 px-2.5 py-0.5 text-[11px] font-semibold text-parchment-50">
              🎨 Creator
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-ink-900">
              {creatorSession.nickname || 'Анонимен'}
            </span>
            <span className="font-mono-rq text-sm text-ink-700">
              {formatDuration(creatorSession.duration_sec ?? 0)}
            </span>
          </div>
        </div>
      )}

      {top10.length === 0 ? (
        <div className="rounded-2xl border border-parchment-200 bg-white p-8 text-center shadow-soft">
          <p className="text-base text-ink-700">Още няма играчи.</p>
          <p className="mt-1 text-sm text-ink-500">
            Сподели quest-а, за да започне класирането.
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {top10.map((row, idx) => {
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
                <span className="w-7 flex-none text-center font-mono-rq text-sm font-semibold text-ink-700">
                  {idx < 3 ? MEDAL[idx] : row.rank ?? idx + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink-900">
                    {row.nickname || 'Анонимен'}
                    {me && (
                      <span className="ml-1.5 text-[11px] text-terracotta-500">(ти)</span>
                    )}
                  </p>
                  <p className="text-[11px] text-ink-500">{STATUS_LABEL[row.status]}</p>
                </div>
                <div className="text-right font-mono-rq text-sm text-ink-700">
                  {isTreasure
                    ? formatDuration(row.duration_sec ?? 0)
                    : `${row.total_score} т.`}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Sticky current user if outside top 10 */}
      {myRow && !myInTop && (
        <div className="sticky bottom-20 mt-4 rounded-xl border border-terracotta-500 bg-parchment-50 p-3 shadow-soft">
          <div className="flex items-center gap-3">
            <span className="w-7 flex-none text-center font-mono-rq text-sm font-semibold text-ink-700">
              {myRow.rank ?? '—'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-ink-900">
                {myRow.nickname || 'Анонимен'}
                <span className="ml-1.5 text-[11px] text-terracotta-500">(ти)</span>
              </p>
              <p className="text-[11px] text-ink-500">{STATUS_LABEL[myRow.status]}</p>
            </div>
            <div className="text-right font-mono-rq text-sm text-ink-700">
              {isTreasure
                ? formatDuration(myRow.duration_sec ?? 0)
                : `${myRow.total_score} т.`}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
