import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ListChecks, Play, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [quest, setQuest] = useState<Quest | null>(null);
  const [tasks, setTasks] = useState<PublicTask[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const [q, ts, paths] = await Promise.all([
          fetchQuest(id),
          fetchPublicTasks(id),
          fetchSourceImagePaths(id),
        ]);
        if (cancelled) return;
        if (!q) {
          setError(t('quest.intro.notFound'));
          return;
        }
        setQuest(q);
        setTasks(ts);

        if (paths.length > 0) {
          const { data } = await invokeFn<{ urls: string[] }>('sign-download-urls', {
            bucket: SOURCE_BUCKET,
            paths,
            ttl_sec: 600,
          }).then((d) => ({ data: d })).catch(() => ({ data: null }));
          if (data?.urls) setThumbs(data.urls);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || t('common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id, t]);

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
      toast({ title: t('quest.intro.startFailed'), description: e?.message, variant: 'destructive' });
      setStarting(false);
    }
  };

  if (loading) {
    return <div className="mx-auto w-full max-w-md px-5 pt-10 text-center text-ink-500">{t('common.loading')}</div>;
  }
  if (error || !quest) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pt-10 text-center">
        <p className="text-danger-600">{error || t('quest.intro.notFound')}</p>
        <Link to="/home" className="mt-4 inline-block text-forest-700 hover:underline">{t('quest.intro.toHome')}</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link to="/home" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> {t('tabs.home')}
      </Link>

      <header className="mt-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-forest-700">{t('quest.intro.ready')}</p>
        <h1 className="mt-2 font-display text-[28px] leading-tight text-ink-900">{quest.title}</h1>
        {quest.description && <p className="mt-3 text-base text-ink-700">{quest.description}</p>}
        <p className="mt-3 inline-flex items-center gap-1 font-mono-rq text-sm text-ink-500">
          <ListChecks size={14} /> {t('quest.intro.tasks', { count: tasks.length })}
        </p>
      </header>

      {thumbs.length > 0 && (
        <div className="mt-6 flex justify-center gap-2">
          {thumbs.map((url, i) => (
            <img key={i} src={url} alt={t('quest.intro.sourceImg', { n: i + 1 })} className="h-12 w-12 rounded-lg object-cover shadow-soft" />
          ))}
        </div>
      )}

      <div className="mt-8 space-y-3">
        <button type="button" onClick={onStart} disabled={starting}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700 disabled:opacity-60">
          <Play size={18} /> {starting ? t('quest.intro.starting') : t('quest.intro.start')}
        </button>
        <button type="button" onClick={() => setShowShare(true)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-forest-700 bg-white px-4 text-base font-semibold text-forest-700 hover:bg-parchment-100">
          <Share2 size={18} /> {t('quest.intro.shareWithFriend')}
        </button>
      </div>

      {showShare && (
        <ShareModal questTitle={quest.title} shareToken={quest.share_token} onClose={() => setShowShare(false)} />
      )}
    </div>
  );
}
