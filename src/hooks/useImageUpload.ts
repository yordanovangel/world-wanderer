import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UploadPurpose = 'quest_source' | 'task_reference' | 'task_submission';

export type UploadMetadata = {
  quest_id?: string;
  task_id?: string;
  session_id?: string;
};

type SignedUrlResponse = {
  bucket: string;
  upload_urls: string[];
  paths: string[];
};

const TOKEN_KEY = 'rq_auth_token';

function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Shared hook for the camera → resize → upload pipeline.
 *
 * Flow:
 *   1) Ask edge function `get-upload-urls` for a signed PUT URL in the bucket
 *      that matches `purpose` (validates ownership).
 *   2) PUT the blob directly to Supabase Storage.
 *   3) Return the storage path so the caller can persist it.
 */
export function useImageUpload(purpose: UploadPurpose) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (blob: Blob, metadata: UploadMetadata = {}): Promise<{ storage_path: string; bucket: string }> => {
      setError(null);
      setIsUploading(true);
      try {
        // 1) Get a signed upload URL
        const { data, error: fnErr } = await supabase.functions.invoke<SignedUrlResponse>(
          'get-upload-urls',
          {
            body: { purpose, count: 1, metadata },
            headers: authHeader(),
          },
        );

        if (fnErr || !data) {
          let message = fnErr?.message || 'Не успяхме да получим адрес за качване';
          const ctx = (fnErr as any)?.context;
          if (ctx && typeof ctx.json === 'function') {
            try {
              const j = await ctx.json();
              if (j?.error) message = j.error;
            } catch {
              /* ignore */
            }
          }
          throw new Error(message);
        }

        const url = data.upload_urls[0];
        const path = data.paths[0];
        if (!url || !path) throw new Error('Получен е празен upload URL');

        // 2) PUT blob directly to storage
        const res = await fetch(url, {
          method: 'PUT',
          body: blob,
          headers: { 'Content-Type': 'image/jpeg' },
        });
        if (!res.ok) {
          throw new Error(`Качването неуспешно (${res.status})`);
        }

        return { storage_path: path, bucket: data.bucket };
      } catch (e: any) {
        const msg = e?.message || 'Грешка при качване';
        setError(msg);
        throw e;
      } finally {
        setIsUploading(false);
      }
    },
    [purpose],
  );

  return { upload, isUploading, error };
}
