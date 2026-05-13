import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function SectionError({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between rounded-xl border border-parchment-200 bg-white px-4 py-3 shadow-soft">
      <p className="text-sm text-ink-500">{t('common.loadFailed')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:underline"
      >
        <RefreshCw size={14} /> {t('common.retry')}
      </button>
    </div>
  );
}
