import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Plus, X, Sparkles } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from '@/hooks/use-toast';

const MAX_SLOTS = 3;
const STORAGE_KEY = 'rq_multi_capture';

type Slot = {
  blob: Blob;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  storagePath?: string;
};

/** Capture screen for multiplayer flow. After upload navigates to /create/multi/config. */
export default function MultiCapturePage() {
  const [questId] = useState(() => crypto.randomUUID());
  const [slots, setSlots] = useState<Slot[]>([]);
  const { upload } = useImageUpload('quest_source');
  const navigate = useNavigate();
  const cleanupRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      cleanupRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const addSlot = async (blob: Blob) => {
    if (slots.length >= MAX_SLOTS) return;
    const previewUrl = URL.createObjectURL(blob);
    cleanupRef.current.push(previewUrl);
    const newSlot: Slot = { blob, previewUrl, status: 'uploading' };
    setSlots((s) => [...s, newSlot]);
    try {
      const { storage_path } = await upload(blob, { quest_id: questId });
      setSlots((s) =>
        s.map((x) =>
          x.previewUrl === previewUrl
            ? { ...x, status: 'uploaded', storagePath: storage_path }
            : x,
        ),
      );
    } catch (e: any) {
      setSlots((s) =>
        s.map((x) => (x.previewUrl === previewUrl ? { ...x, status: 'failed' } : x)),
      );
      toast({
        title: 'Не успяхме да качим снимката',
        description: e?.message,
        variant: 'destructive',
      });
    }
  };

  const removeSlot = (i: number) => {
    setSlots((s) => s.filter((_, idx) => idx !== i));
  };

  const uploadedPaths = slots
    .filter((s): s is Slot & { storagePath: string } => !!s.storagePath)
    .map((s) => s.storagePath);

  const ready = uploadedPaths.length >= 1 && !slots.some((s) => s.status === 'uploading');

  const onContinue = () => {
    if (!ready) return;
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ source_paths: uploadedPaths }),
    );
    navigate('/create/multi/config');
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link to="/create" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> Назад
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-[22px] text-ink-900">
          Заснеми 1–3 снимки за приключението
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          AI ще генерира задачи, които приятелите ти ще играят
        </p>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: MAX_SLOTS }).map((_, i) => {
          const slot = slots[i];
          if (!slot) {
            const isNext = i === slots.length;
            return (
              <div
                key={i}
                className={`flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-parchment-200 bg-white/40 ${
                  !isNext ? 'opacity-40' : ''
                }`}
              >
                <div className="scale-90">
                  <CameraCapture label="" onCapture={addSlot} disabled={!isNext} />
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="relative aspect-square overflow-hidden rounded-2xl bg-parchment-100 shadow-soft"
            >
              <img src={slot.previewUrl} alt="Снимка" className="h-full w-full object-cover" />
              {slot.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-ink-900/30 text-[11px] font-medium text-parchment-50">
                  Качване…
                </div>
              )}
              {slot.status === 'failed' && (
                <div className="absolute inset-0 flex items-center justify-center bg-danger-600/40 text-[11px] font-semibold text-parchment-50">
                  Грешка
                </div>
              )}
              <button
                type="button"
                onClick={() => removeSlot(i)}
                aria-label="Премахни"
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/70 text-parchment-50 shadow-soft hover:bg-ink-900"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-ink-500">
        {uploadedPaths.length}/{MAX_SLOTS} качени
      </p>

      <button
        type="button"
        onClick={onContinue}
        disabled={!ready}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none"
      >
        Продължи към настройки
      </button>

      <p className="mt-4 text-center text-[11px] text-ink-300">
        <Compass size={12} className="mb-0.5 inline" /> Quest id {questId.slice(0, 8)}
      </p>
      <span className="hidden">{Plus.name}{Sparkles.name}</span>
    </div>
  );
}
