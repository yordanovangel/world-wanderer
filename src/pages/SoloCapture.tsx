import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Compass, Plus, X, Sparkles } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { generateSoloQuest } from '@/lib/queries/quests';
import { toast } from '@/hooks/use-toast';

const MAX_SLOTS = 3;

type Slot = {
  blob: Blob;
  previewUrl: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'failed';
  storagePath?: string;
};

export default function SoloCapturePage() {
  // We generate the quest_id client-side so all uploads land under one folder
  // (the edge function rejects paths not prefixed with the user's id).
  const [questId] = useState(() => crypto.randomUUID());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [generating, setGenerating] = useState(false);
  const { upload } = useImageUpload('quest_source');
  const navigate = useNavigate();

  // revoke blob URLs when slots change/unmount
  useEffect(() => {
    return () => {
      slots.forEach((s) => URL.revokeObjectURL(s.previewUrl));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addSlot = async (blob: Blob) => {
    if (slots.length >= MAX_SLOTS) return;
    const previewUrl = URL.createObjectURL(blob);
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
        title: 'Не успяхме да качим снимката — провери интернет',
        description: e?.message,
        variant: 'destructive',
      });
    }
  };

  const removeSlot = (i: number) => {
    setSlots((s) => {
      const removed = s[i];
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return s.filter((_, idx) => idx !== i);
    });
  };

  const uploadedCount = slots.filter((s) => s.status === 'uploaded').length;
  const anyUploading = slots.some((s) => s.status === 'uploading');
  const ready = uploadedCount >= 1 && !anyUploading && !generating;

  const onGenerate = async () => {
    if (!ready) return;
    setGenerating(true);
    try {
      const paths = slots
        .filter((s): s is Slot & { storagePath: string } => !!s.storagePath)
        .map((s) => s.storagePath);
      const result = await generateSoloQuest({ source_paths: paths });
      navigate(`/quest/${result.quest_id}/intro`, { replace: true });
    } catch (e: any) {
      toast({
        title: 'Не успяхме да генерираме quest',
        description: e?.message,
        variant: 'destructive',
      });
      setGenerating(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to="/create"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Назад
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-[22px] text-ink-900">
          Заснеми 1–3 снимки на околността
        </h1>
        <p className="mt-1 text-sm text-ink-500">
          AI ще ги анализира и ще ти генерира quest
        </p>
      </header>

      <div className="mt-6 grid grid-cols-3 gap-3">
        {Array.from({ length: MAX_SLOTS }).map((_, i) => {
          const slot = slots[i];
          if (!slot) {
            const isNext = i === slots.length;
            return (
              <CaptureSlotEmpty
                key={i}
                disabled={!isNext}
                onCapture={addSlot}
              />
            );
          }
          return (
            <FilledSlot key={i} slot={slot} onRemove={() => removeSlot(i)} />
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-ink-500">
        {uploadedCount}/{MAX_SLOTS} качени
      </p>

      <button
        type="button"
        onClick={onGenerate}
        disabled={!ready}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700 disabled:cursor-not-allowed disabled:bg-parchment-200 disabled:text-ink-300 disabled:shadow-none"
      >
        <Sparkles size={18} /> Генерирай quest
      </button>

      {generating && <GeneratingOverlay />}
    </div>
  );
}

function CaptureSlotEmpty({
  onCapture,
  disabled,
}: {
  onCapture: (b: Blob) => void;
  disabled: boolean;
}) {
  // Reuse CameraCapture but render a compact tile that triggers it
  const [hidden, setHidden] = useState(false);
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-2xl border-2 border-dashed border-parchment-200 bg-white/40 ${
        disabled ? 'opacity-40' : ''
      }`}
    >
      {!hidden && (
        <CompactCapture
          disabled={disabled}
          onCapture={(b) => {
            setHidden(true);
            onCapture(b);
            setHidden(false);
          }}
        />
      )}
    </div>
  );
}

function CompactCapture({
  onCapture,
  disabled,
}: {
  onCapture: (b: Blob) => void;
  disabled: boolean;
}) {
  return (
    <div className="scale-90">
      <CameraCapture
        label=""
        onCapture={onCapture}
        disabled={disabled}
      />
    </div>
  );
}

function FilledSlot({ slot, onRemove }: { slot: Slot; onRemove: () => void }) {
  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-parchment-100 shadow-soft">
      <img
        src={slot.previewUrl}
        alt="Снимка"
        className="h-full w-full object-cover"
        draggable={false}
      />
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
        onClick={onRemove}
        aria-label="Премахни"
        className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-ink-900/70 text-parchment-50 shadow-soft hover:bg-ink-900"
      >
        <X size={14} />
      </button>
    </div>
  );
}

function GeneratingOverlay() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-parchment-50/95 backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <Compass size={64} className="animate-spin text-terracotta-500" style={{ animationDuration: '2.4s' }} />
      <p className="font-display text-2xl text-ink-900">AI анализира…</p>
      <p className="text-sm text-ink-500">Това може да отнеме до минута.</p>
    </div>
  );
}

// Hide the + icon visually inside CompactCapture: we want a small tile.
// The CameraCapture component shows a 96px circle by default. To fit it in
// the 120px slot with a smaller affordance, we'd ideally have a `compact`
// prop. For now the scale-90 wrapper above is enough.
export const __PLUS_PLACEHOLDER__ = Plus;
