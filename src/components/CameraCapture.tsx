import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';

export type CameraCaptureProps = {
  onCapture: (blob: Blob) => void | Promise<void>;
  label?: string;
  description?: string;
  disabled?: boolean;
};

const COMPRESSION_OPTS = {
  maxWidthOrHeight: 1080,
  maxSizeMB: 1,
  useWebWorker: true,
  fileType: 'image/jpeg',
  initialQuality: 0.82,
} as const;

export function CameraCapture({
  onCapture,
  label,
  description,
  disabled,
}: CameraCaptureProps) {
  const { t } = useTranslation();
  const finalLabel = label ?? t('camera.capture');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);

  const open = () => {
    if (disabled || busy) return;
    inputRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setBusy(true);
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTS);
      await onCapture(compressed);
    } catch (err) {
      console.error('[CameraCapture] compression failed', err);
      toast({
        title: t('camera.compressFailedTitle'),
        description: t('camera.compressFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={open}
        disabled={disabled || busy}
        aria-label={finalLabel}
        className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-terracotta-500 text-parchment-50 shadow-card transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none"
      >
        {busy ? <Loader2 size={40} className="animate-spin" /> : <Camera size={40} />}
      </button>
      <div className="text-center">
        <p className="text-sm font-medium text-ink-900">{busy ? t('camera.processing') : finalLabel}</p>
        {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
