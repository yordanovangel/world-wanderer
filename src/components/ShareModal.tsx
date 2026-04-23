import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Share2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

type Props = {
  questTitle?: string;
  shareToken: string;
  onClose: () => void;
};

export function ShareModal({ questTitle, shareToken, onClose }: Props) {
  const shareUrl = useMemo(
    () => `${window.location.origin}/join/${shareToken}`,
    [shareToken],
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: 'Копирано!' });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ title: 'Не успяхме да копираме', variant: 'destructive' });
    }
  };

  const onNativeShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: questTitle ?? 'Reality Quest',
          text: questTitle ? `Хайде да играем "${questTitle}"!` : 'Хайде да играем заедно!',
          url: shareUrl,
        });
      } catch {
        /* user dismissed */
      }
    } else {
      onCopy();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Сподели quest"
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink-900/40 px-4 py-6 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-parchment-50 p-6 shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Затвори"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-ink-500 hover:bg-parchment-200 hover:text-ink-900"
        >
          <X size={18} />
        </button>

        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">
            Сподели приключението
          </p>
          {questTitle && (
            <h2 className="mt-1 line-clamp-2 font-display text-[20px] leading-tight text-ink-900">
              {questTitle}
            </h2>
          )}
        </header>

        <div className="mt-5 flex justify-center">
          <div className="rounded-2xl bg-white p-3 shadow-soft">
            <QRCodeSVG
              value={shareUrl}
              size={200}
              level="M"
              marginSize={2}
              fgColor="#7a3a1f"
              bgColor="#ffffff"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={onCopy}
          aria-label="Копирай линка"
          className="mt-4 block w-full select-all break-all rounded-xl bg-white px-3 py-2.5 text-center font-mono-rq text-xs text-ink-700 shadow-soft transition-colors hover:bg-parchment-100"
        >
          {shareUrl}
        </button>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onCopy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-ink-900 shadow-soft hover:bg-parchment-100"
          >
            <Copy size={16} /> {copied ? 'Копирано!' : 'Копирай'}
          </button>
          <button
            type="button"
            onClick={onNativeShare}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-terracotta-500 text-sm font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
          >
            <Share2 size={16} /> Сподели
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 block w-full rounded-xl px-4 py-2 text-center text-sm font-medium text-ink-500 hover:bg-parchment-100 hover:text-ink-900"
        >
          Готово
        </button>
      </div>
    </div>
  );
}
