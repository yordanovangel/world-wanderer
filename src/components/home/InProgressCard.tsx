import { Hourglass } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SessionSummary } from '@/lib/queries/home';
import { daysRemaining, sessionExpiresAt } from '@/lib/format';
import { ModeIcon } from './ModeIcon';

export function InProgressCard({ s }: { s: SessionSummary }) {
  const total = Math.max(s.total_tasks, 1);
  const pct = Math.min(100, Math.round((s.submitted_tasks / total) * 100));
  const days = daysRemaining(sessionExpiresAt(s.started_at));

  return (
    <Link
      to={`/quest/${s.quest_id}/play`}
      className="rq-mission-card flex h-36 w-[280px] flex-none flex-col justify-between p-4 transition hover:shadow-card"
    >
      <div className="flex items-start gap-2">
        <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-parchment-100 text-forest-700">
          <ModeIcon mode={s.mode} size={16} />
        </span>
        <h3
          className="font-display text-[18px] leading-snug text-ink-900"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {s.quest_title}
        </h3>
      </div>

      <div>
        <div className="mb-1 flex items-baseline justify-between text-xs text-ink-500">
          <span className="font-mono-rq">
            {s.submitted_tasks}/{s.total_tasks} задачи
          </span>
          <span className="font-mono-rq">{pct}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-parchment-200">
          <div
            className="h-full rounded-full bg-terracotta-500 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-ink-500">
          <Hourglass size={12} /> Изтича след {days} {days === 1 ? 'ден' : 'дни'}
        </p>
      </div>
    </Link>
  );
}
