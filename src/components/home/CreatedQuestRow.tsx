import { Link } from 'react-router-dom';
import type { CreatedQuest } from '@/lib/queries/home';
import { ModeIcon, MODE_LABEL } from './ModeIcon';

export function CreatedQuestRow({ q }: { q: CreatedQuest }) {
  const isDraft = q.status === 'draft';
  return (
    <Link
      to={`/quest/${q.id}/play`}
      className="flex items-center gap-3 rounded-xl border border-parchment-200 bg-white p-3 shadow-soft transition hover:bg-parchment-100"
    >
      <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-parchment-100 text-forest-700">
        <ModeIcon mode={q.mode} size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold text-ink-900">{q.title}</p>
        <p className="text-xs text-ink-500">
          {MODE_LABEL[q.mode]} · {isDraft ? 'Чернова' : 'Публикуван'}
        </p>
      </div>
    </Link>
  );
}
