import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, ArrowLeft, ChevronRight, Loader2, Share2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/lib/auth-context';
import { fetchCreatedQuestsAll } from '@/lib/queries/history';
import { archiveQuest, fetchQuest } from '@/lib/queries/quests';
import { ModeIcon } from '@/components/home/ModeIcon';
import { EmptyState } from '@/components/EmptyState';
import { ShareModal } from '@/components/ShareModal';
import { toast } from '@/hooks/use-toast';

const STATUS_CLASS: Record<'draft' | 'published' | 'archived', string> = {
  draft: 'bg-ochre-200 text-ochre-700',
  published: 'bg-forest-200 text-forest-700',
  archived: 'bg-parchment-200 text-ink-500',
};

type Row = Awaited<ReturnType<typeof fetchCreatedQuestsAll>>[number];

export default function ProfileCreatedPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<{ token: string; title: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchCreatedQuestsAll(user.id)
      .then((rows) => !cancelled && setItems(rows))
      .catch((e) =>
        toast({ title: t('profile.createdLoadFailed'), description: e?.message, variant: 'destructive' }),
      )
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [user, t]);

  const onShare = async (quest: Row) => {
    try {
      const q = await fetchQuest(quest.id);
      if (!q) throw new Error(t('profile.questNotFound'));
      setShareTarget({ token: q.share_token, title: q.title });
    } catch (e: any) {
      toast({ title: t('common.error'), description: e?.message, variant: 'destructive' });
    }
  };

  const onArchive = async (quest: Row) => {
    if (!confirm(t('profile.confirmArchive'))) return;
    setArchivingId(quest.id);
    try {
      await archiveQuest(quest.id);
      setItems((prev) => prev.map((q) => (q.id === quest.id ? { ...q, status: 'archived' } : q)));
      toast({ title: t('profile.archivedToast') });
    } catch (e: any) {
      toast({ title: t('profile.archiveFailed'), description: e?.message, variant: 'destructive' });
    } finally {
      setArchivingId(null);
    }
  };

  const STATUS_LABEL = (s: 'draft' | 'published' | 'archived') =>
    s === 'draft' ? t('profile.draft') : s === 'archived' ? t('profile.archived') : t('profile.published');

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link to="/profile" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
        <ArrowLeft size={16} /> {t('profile.backToProfile')}
      </Link>

      <h1 className="mt-4 font-display text-[28px] leading-tight text-ink-900">{t('profile.createdTitle')}</h1>

      {loading ? (
        <div className="mt-10 flex justify-center text-ink-500"><Loader2 size={20} className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <EmptyState variant="no-quests" className="mt-8"
          action={
            <Link to="/create"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-terracotta-500 px-5 text-sm font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700">
              {t('profile.createQuest')}
            </Link>
          } />
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((q) => {
            const isDraft = q.status === 'draft';
            const isArchived = q.status === 'archived';
            const linkTo = isDraft
              ? q.mode === 'treasure_hunt' ? `/create/treasure/wizard?quest=${q.id}` : `/create`
              : `/quest/${q.id}/leaderboard`;
            return (
              <li key={q.id} className="rounded-2xl border border-parchment-200 bg-white p-3 shadow-soft">
                <Link to={linkTo} className="-m-1 flex items-center gap-3 rounded-xl p-1 hover:bg-parchment-100">
                  <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-parchment-100 text-forest-700">
                    <ModeIcon mode={q.mode} size={20} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-[17px] leading-tight text-ink-900">{q.title}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[q.status]}`}>
                        {STATUS_LABEL(q.status)}
                      </span>
                      <span className="text-xs text-ink-500">{t(`mode.${q.mode}`)}</span>
                    </div>
                  </div>
                  {isDraft ? (
                    <span className="flex-none text-xs font-medium text-terracotta-500">{t('profile.continueArrow')}</span>
                  ) : (
                    <ChevronRight size={16} className="flex-none text-ink-300" />
                  )}
                </Link>

                {!isDraft && (
                  <div className="mt-3 flex gap-2 border-t border-parchment-200 pt-3">
                    <button type="button" onClick={() => onShare(q)} disabled={isArchived}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-parchment-100 text-xs font-medium text-ink-900 hover:bg-parchment-200 disabled:cursor-not-allowed disabled:opacity-50">
                      <Share2 size={13} /> {t('profile.shareBtn')}
                    </button>
                    <button type="button" onClick={() => onArchive(q)} disabled={isArchived || archivingId === q.id}
                      className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-parchment-100 text-xs font-medium text-ink-700 hover:bg-parchment-200 disabled:cursor-not-allowed disabled:opacity-50">
                      <Archive size={13} />{' '}
                      {archivingId === q.id ? t('profile.archivingBtn') : isArchived ? t('profile.archivedBtn') : t('profile.archiveBtn')}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {shareTarget && (
        <ShareModal questTitle={shareTarget.title} shareToken={shareTarget.token} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}
