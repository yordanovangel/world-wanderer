import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { CreatedQuest } from '@/lib/queries/home';
import { ModeIcon } from './ModeIcon';

export function CreatedQuestRow({ q }: { q: CreatedQuest }) {
  const { t } = useTranslation();
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
          {t(`mode.${q.mode}`)} · {isDraft ? t('profile.draft') : t('profile.published')}
        </p>
      </div>
    </Link>
  );
}
