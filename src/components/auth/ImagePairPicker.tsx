import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export type LoginImage = {
  id: string;
  storage_path: string;
  label: string | null;
};

type Props = {
  selected: string[]; // up to 2 image IDs (selection order)
  onChange: (ids: string[]) => void;
};

const BUCKET = 'login-images';

/**
 * Grid of login images. User picks two (selection order matters for UI hint
 * — "first" / "second" — but normalization happens at submit time).
 */
export function ImagePairPicker({ selected, onChange }: Props) {
  const [images, setImages] = useState<LoginImage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('login_images')
        .select('id, storage_path, label')
        .order('created_at', { ascending: true });
      if (cancelled) return;
      if (error) {
        setError('Не успяхме да заредим картинките');
        return;
      }
      setImages(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const urlFor = useMemo(() => {
    return (path: string) =>
      supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
      return;
    }
    if (selected.length < 2) {
      onChange([...selected, id]);
      return;
    }
    // already 2 selected — replace the second (most recent) with the new tap
    onChange([selected[0], id]);
  };

  if (error) {
    return <p className="text-center text-sm text-danger-600">{error}</p>;
  }

  if (!images) {
    return (
      <div className="grid grid-cols-5 gap-3">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="aspect-square animate-pulse rounded-full bg-parchment-100"
          />
        ))}
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <p className="rounded-xl border border-parchment-200 bg-white p-4 text-center text-sm text-ink-500">
        Няма качени картинки в пула. Свържи се с администратор.
      </p>
    );
  }

  const selectedImages = selected
    .map((id) => images.find((i) => i.id === id))
    .filter(Boolean) as LoginImage[];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-5 gap-3">
        {images.map((img) => {
          const idx = selected.indexOf(img.id);
          const isSelected = idx >= 0;
          return (
            <button
              key={img.id}
              type="button"
              onClick={() => toggle(img.id)}
              className={cn(
                'relative aspect-square overflow-hidden rounded-full bg-parchment-100 transition',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-terracotta-500/40',
                isSelected
                  ? 'ring-[3px] ring-terracotta-500 ring-offset-2 ring-offset-parchment-50'
                  : 'ring-1 ring-parchment-200 hover:ring-parchment-200',
              )}
              aria-pressed={isSelected}
              aria-label={img.label ?? 'картинка'}
            >
              <img
                src={urlFor(img.storage_path)}
                alt={img.label ?? ''}
                loading="lazy"
                className="h-full w-full object-cover"
                draggable={false}
              />
              {isSelected && (
                <span className="absolute -bottom-0.5 -right-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-terracotta-500 font-mono-rq text-[11px] font-semibold text-parchment-50">
                  {idx + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {selectedImages.length > 0 && (
        <p className="text-center text-xs text-ink-500">
          Избрани: {selectedImages.map((i) => i.label || '—').join(' + ')}
        </p>
      )}
    </div>
  );
}
