import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ListChecks, Play, Share2 } from 'lucide-react';
import {
  fetchPublicTasks,
  fetchQuest,
  fetchSourceImagePaths,
  startSession,
  type PublicTask,
  type Quest,
} from '@/lib/queries/quests';
import { invokeFn } from '@/lib/fn';
import { toast } from '@/hooks/use-toast';
import { ShareModal } from '@/components/ShareModal';

const SOURCE_BUCKET = 'quest-sources';

export default function QuestIntroPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [q, t, paths] = await Promise.all([
          fetchQuest(id),
          fetchPublicTasks(id),
          fetchSourceImagePaths(id),
        ]);
        if (cancelled) return;
        if (!q) {
          setError('Quest-ът не съществува');
          return;
        }
        setQuest(q);
        setTasks(t);

        // Sign download URLs for source thumbnails (private bucket)
        if (paths.length > 0) {
          const { data, error: signErr } = await invokeFn<{
            urls: string[];
          }>('sign-download-urls', {
            bucket: SOURCE_BUCKET,
            paths,
            ttl_sec: 600,
          }).then((d) => ({ data: d, error: null }))
            .catch((e) => ({ data: null, error: e }));
          if (data?.urls) {
            setThumbs(data.urls);
          } else if (signErr) {
            console.warn('thumb sign failed', signErr);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Грешка');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const onStart = async () => {
    if (!id || !quest) return;
    setStarting(true);
    try {
      const { session_id } = await startSession(id);
      const playPath =
        quest.mode === 'treasure_hunt'
          ? `/quest/${id}/treasure-play?session=${session_id}`
          : `/quest/${id}/play?session=${session_id}`;
      navigate(playPath, { replace: true });
    } catch (e: any) {
      toast({
        title: 'Не успяхме да стартираме сесия',
        description: e?.message,
        variant: 'destructive',
      });
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pt-10 text-center text-ink-500">
        Зареждане…
      </div>
    );
  }
  if (error || !quest) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pt-10 text-center">
        <p className="text-danger-600">{error || 'Quest-ът не съществува'}</p>
        <Link to="/home" className="mt-4 inline-block text-forest-700 hover:underline">
          Към начало
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to="/home"
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Начало
      </Link>

      <header className="mt-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">
          Твоят quest е готов!
        </p>
        <h1 className="mt-2 font-display text-[28px] leading-tight text-ink-900">
          {quest.title}
        </h1>
        {quest.description && (
          <p className="mt-3 text-base text-ink-700">{quest.description}</p>
        )}
        <p className="mt-3 inline-flex items-center gap-1 font-mono-rq text-sm text-ink-500">
          <ListChecks size={14} /> {tasks.length} задачи
        </p>
      </header>

      {thumbs.length > 0 && (
        <div className="mt-6 flex justify-center gap-2">
          {thumbs.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Източник ${i + 1}`}
              className="h-12 w-12 rounded-lg object-cover shadow-soft"
            />
          ))}
        </div>
      )}

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={onStart}
          disabled={starting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft transition-colors hover:bg-terracotta-700 disabled:opacity-60"
        >
          <Play size={18} /> {starting ? 'Стартиране…' : 'Започни'}
        </button>
        <button
          type="button"
          disabled
          title="Скоро"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-forest-700 bg-white px-4 text-base font-semibold text-forest-700 opacity-60"
        >
          <Share2 size={18} /> Сподели с приятел
        </button>
      </div>
    </div>
  );
}
