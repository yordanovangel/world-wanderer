import { Check, RotateCcw } from 'lucide-react';

export type ImagePreviewProps = {
  src: string;
  onConfirm: () => void;
  onRetake: () => void;
  confirmLabel?: string;
  retakeLabel?: string;
  busy?: boolean;
};

export function ImagePreview({
  src,
  onConfirm,
  onRetake,
  confirmLabel = 'Приеми',
  retakeLabel = 'Снимай пак',
  busy,
}: ImagePreviewProps) {
  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl shadow-card">
        <img
          src={src}
          alt="Преглед"
          className="block h-auto w-full bg-parchment-100 object-cover"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onRetake}
          disabled={busy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-forest-700 bg-white px-4 text-base font-semibold text-forest-700 transition-colors hover:bg-forest-200/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RotateCcw size={18} /> {retakeLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none"
        >
          <Check size={18} /> {confirmLabel}
        </button>
      </div>
    </div>
  );
}
