import { Link } from 'react-router-dom';
import type { SessionSummary } from '@/lib/queries/home';
import { formatDuration } from '@/lib/format';
import { ModeIcon } from './ModeIcon';

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

export function PastSessionRow({ s }: { s: SessionSummary }) {
  const isCompleted = s.status === 'completed';
  return (
    <Link
      to={`/quest/${s.quest_id}/play`}
      className="flex items-center gap-3 rounded-xl border border-parchment-200 bg-white p-3 shadow-soft transition hover:bg-parchment-100"
    >
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-parchment-100 text-forest-700">
        <ModeIcon mode={s.mode} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-ink-900">{s.quest_title}</p>
        <span
          className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[s.status]}`}
        >
          {STATUS_LABEL[s.status]}
        </span>
      </div>
      <div className="text-right font-mono-rq text-sm text-ink-500">
        {isCompleted ? `${s.total_score} т.` : formatDuration(s.duration_sec)}
      </div>
    </Link>
  );
}
