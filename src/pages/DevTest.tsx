import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';
import { ImagePreview } from '@/components/ImagePreview';
import { useImageUpload } from '@/hooks/useImageUpload';
import { toast } from '@/hooks/use-toast';

/**
 * Dev sandbox for the image pipeline.
 * Generates a throwaway quest_id client-side and uploads to `quest-sources`.
 * Path is namespaced by user_id, so this never collides with real quests.
 */
export default function DevTestPage() {
  const [questId] = useState(() => crypto.randomUUID());
  const [blob, setBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [uploadedSize, setUploadedSize] = useState<number | null>(null);
  const { upload, isUploading } = useImageUpload('quest_source');

  useEffect(() => {
    if (!blob) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(blob);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [blob]);

  const handleConfirm = async () => {
    if (!blob) return;
    try {
      const { storage_path } = await upload(blob, { quest_id: questId });
      setUploadedPath(storage_path);
      setUploadedSize(blob.size);
      setBlob(null);
      toast({ title: 'Качено успешно', description: storage_path });
    } catch (e: any) {
      toast({
        title: 'Не успяхме да качим снимката — провери интернет',
        description: e?.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="mx-auto min-h-screen w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to="/home"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Назад
      </Link>

      <header className="mt-4">
        <h1 className="font-display text-2xl text-ink-900">Тест на камера + качване</h1>
        <p className="mt-1 text-sm text-ink-500">
          Bucket: <span className="font-mono-rq">quest-sources</span>
        </p>
        <p className="mt-1 break-all font-mono-rq text-[11px] text-ink-300">
          quest_id: {questId}
        </p>
      </header>

      <section className="mt-8">
        {previewUrl ? (
          <ImagePreview
            src={previewUrl}
            onConfirm={handleConfirm}
            onRetake={() => setBlob(null)}
            confirmLabel={isUploading ? 'Качване…' : 'Приеми'}
            busy={isUploading}
          />
        ) : (
          <CameraCapture
            label="Снимай"
            description="Натисни и направи снимка с камерата"
            onCapture={(b) => setBlob(b)}
          />
        )}
      </section>

      {uploadedPath && (
        <section className="mt-8 rounded-2xl border border-forest-200 bg-forest-200/30 p-4">
          <p className="text-sm font-semibold text-forest-700">Успешно качено</p>
          <p className="mt-1 break-all font-mono-rq text-xs text-ink-700">{uploadedPath}</p>
          {uploadedSize !== null && (
            <p className="mt-1 font-mono-rq text-[11px] text-ink-500">
              {(uploadedSize / 1024).toFixed(1)} KB
            </p>
          )}
        </section>
      )}
    </div>
  );
}
