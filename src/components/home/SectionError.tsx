import { RefreshCw } from 'lucide-react';

export function SectionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-parchment-200 bg-white px-4 py-3 shadow-soft">
      <p className="text-sm text-ink-500">Не можахме да заредим</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex items-center gap-1 text-sm font-medium text-terracotta-700 hover:underline"
      >
        <RefreshCw size={14} /> Опитай пак
      </button>
    </div>
  );
}
