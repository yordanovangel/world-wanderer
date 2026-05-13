import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Plus, X, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { CameraCapture } from '@/components/CameraCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from '@/hooks/use-toast';

const MAX_SLOTS = 3;
const STORAGE_KEY = 'rq_multi_capture';

type Slot = { blob: Blob; previewUrl: string; status: 'pending' | 'uploading' | 'uploaded' | 'failed'; storagePath?: string };

export default function MultiCapturePage() {
  const { t } = useTranslation();
  const [questId] = useState(() => crypto.randomUUID());
  const [slots, setSlots] = useState<Slot[]>([]);
  const { upload } = useImageUpload('quest_source');
  const navigate = useNavigate();
  const cleanupRef = useRef<string[]>([]);

  useEffect(() => {
    return () => { cleanupRef.current.forEach((u) => URL.revokeObjectURL(u)); };
  }, []);

  const addSlot = async (blob: Blob) => {
    if (slots.length >= MAX_SLOTS) return;
    const previewUrl = URL.createObjectURL(blob);
    cleanupRef.current.push(previewUrl);
    setSlots((s) => [...s, { blob, previewUrl, status: 'uploading' }]);
    try {
      const { storage_path } = await upload(blob, { quest_id: questId });
      setSlots((s) => s.map((x) => (x.previewUrl === previewUrl ? { ...x, status: 'uploaded', storagePath: storage_path } : x)));
    } catch (e: any) {
      setSlots((s) => s.map((x) => (x.previewUrl === previewUrl ? { ...x, status: 'failed' } : x)));
      toast({ title: t('solo.uploadShort'), description: e?.message, variant: 'destructive' });
    }
  };

  const removeSlot = (i: number) => setSlots((s) => s.filter((_, idx) => idx !== i));

  const uploadedPaths = slots.filter((s): s is Slot & { storagePath: string } => !!s.storagePath).map((s) => s.storagePath);
  const ready = uploadedPaths.length >= 1 && !slots.some((s) => s.status === 'uploading');

  const onContinue = () => {
    if (!ready) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ source_paths: uploadedPaths }));
    navigate('/create/multi/config');
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link to="/create" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> {t('common.back')}
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-[22px] text-ink-900">{t('multi.captureTitle')}</h1>
        <p className="mt-1 text-sm text-ink-500">{t('multi.captureSubtitle')}</p>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: MAX_SLOTS }).map((_, i) => {
          const slot = slots[i];
          if (!slot) {
            const isNext = i === slots.length;
            return (
              <div key={i} className={`flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-parchment-200 bg-white/40 ${!isNext ? 'opacity-40' : ''}`}>
                <div className="scale-90">
                  <CameraCapture label="" onCapture={addSlot} disabled={!isNext} />
                </div>
              </div>
            );
          }
          return (
            <div key={i} className="relative aspect-square overflow-hidden rounded-2xl bg-parchment-100 shadow-soft">
              <img src={slot.previewUrl} alt={t('image.preview')} className="h-full w-full object-cover" />
              {slot.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-900/30 text-[11px] font-medium text-parchment-50">{t('image.uploading')}</div>
              )}
              {slot.status === 'failed' && (
                <div className="absolute inset-0 flex items-center justify-center bg-danger-600/40 text-[11px] font-semibold text-parchment-50">{t('image.errorBadge')}</div>
              )}
              <button type="button" onClick={() => removeSlot(i)} aria-label={t('solo.removeAria')}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/70 text-parchment-50 shadow-soft hover:bg-ink-900">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-ink-500">{t('solo.uploaded', { done: uploadedPaths.length, total: MAX_SLOTS })}</p>

      <button type="button" onClick={onContinue} disabled={!ready}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none">
        {t('multi.continueToConfig')}
      </button>

      <p className="mt-4 text-center text-[11px] text-ink-300">
        <Compass size={12} className="mb-0.5 inline" /> Quest id {questId.slice(0, 8)}
      </p>
      <span className="hidden">{Plus.name}{Sparkles.name}</span>
    </div>
  );
}
