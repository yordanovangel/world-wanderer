import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { invokeFn } from '@/lib/fn';
import { deleteTreasureTask, publishQuest, reorderTreasureTasks } from '@/lib/queries/treasure';
import { toast } from '@/hooks/use-toast';

const REF_BUCKET = 'task-references';

type Row = {
  id: string;
  order_idx: number;
  hint: string;
  reference_image_path: string | null;
  thumb_url?: string;
};

export default function TreasurePreviewPage() {
  const [params] = useSearchParams();
  const questId = params.get('quest');
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!questId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('quest_tasks_public' as any)
      .select('id, order_idx, description, reference_image_path')
      .eq('quest_id', questId)
      .order('order_idx', { ascending: true });
    if (error) {
      toast({ title: 'Грешка при зареждане', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }
    const list: Row[] = (data ?? []).map((r: any) => ({
      id: r.id,
      order_idx: r.order_idx,
      hint: r.description,
      reference_image_path: r.reference_image_path,
    }));

    // Sign thumbnail URLs
    const paths = list.map((r) => r.reference_image_path).filter((p): p is string => !!p);
    if (paths.length > 0) {
      try {
        const sign = await invokeFn<{ urls: string[] }>('sign-download-urls', {
          bucket: REF_BUCKET,
          paths,
          ttl_sec: 600,
        });
        let urlIdx = 0;
        for (const r of list) {
          if (r.reference_image_path) {
            r.thumb_url = sign.urls[urlIdx++];
          }
        }
      } catch (e) {
        console.warn('thumb sign failed', e);
      }
    }
    setRows(list);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [questId]);

  const move = async (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= rows.length || busy || !questId) return;
    const next = rows.slice();
    [next[idx], next[target]] = [next[target], next[idx]];
    setRows(next);
    setBusy(true);
    try {
      await reorderTreasureTasks({
        quest_id: questId,
        ordered_task_ids: next.map((r) => r.id),
      });
      // refresh order_idx values
      next.forEach((r, i) => (r.order_idx = i + 1));
      setRows([...next]);
    } catch (e: any) {
      toast({ title: 'Не успяхме да преподредим', description: e?.message, variant: 'destructive' });
      load();
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (id: string) => {
    if (busy) return;
    if (!confirm('Сигурен ли си? Задачата се изтрива.')) return;
    setBusy(true);
    try {
      await deleteTreasureTask(id);
      await load();
    } catch (e: any) {
      toast({ title: 'Грешка', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const onAddMore = () => {
    if (!questId) return;
    // Jump back to the wizard at the next empty slot
    const nextStep = rows.length + 1;
    navigate(`/create/treasure/wizard?quest=${questId}&step=${Math.min(nextStep, 10)}`);
  };

  const onPublish = async () => {
    if (!questId || rows.length !== 10) return;
    setPublishing(true);
    try {
      const result = await publishQuest(questId);
      sessionStorage.removeItem('rq_treasure_draft_id');
      navigate(`/quest/${result.quest_id}/intro`, { replace: true });
    } catch (e: any) {
      toast({ title: 'Не успяхме да публикуваме', description: e?.message, variant: 'destructive' });
      setPublishing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-terracotta-500" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <Link
        to={`/create/treasure/wizard?quest=${questId}`}
        className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={16} /> Назад
      </Link>
      <header className="mt-4">
        <h1 className="font-display text-[28px] leading-tight text-ink-900">Преглед преди публикуване</h1>
        <p className="mt-1 text-sm text-ink-500">{rows.length}/10 задачи</p>
      </header>

      <ol className="mt-6 space-y-2">
        {rows.map((r, i) => (
          <li
            key={r.id}
            className="flex items-start gap-3 rounded-2xl border border-parchment-200 bg-white p-3 shadow-soft"
          >
            <span className="inline-flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-parchment-100 font-mono-rq text-xs text-ink-700">
              {i + 1}
            </span>
            {r.thumb_url ? (
              <img src={r.thumb_url} alt="" className="h-14 w-14 flex-none rounded-lg object-cover" />
            ) : (
              <div className="h-14 w-14 flex-none rounded-lg bg-parchment-200" />
            )}
            <p className="min-w-0 flex-1 text-sm leading-snug text-ink-900 line-clamp-2">{r.hint}</p>
            <div className="flex flex-col gap-1">
              <button
                type="button"
                aria-label="Нагоре"
                onClick={() => move(i, -1)}
                disabled={i === 0 || busy}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-parchment-100 text-ink-700 hover:bg-parchment-200 disabled:opacity-40"
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                aria-label="Надолу"
                onClick={() => move(i, 1)}
                disabled={i === rows.length - 1 || busy}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-parchment-100 text-ink-700 hover:bg-parchment-200 disabled:opacity-40"
              >
                <ArrowDown size={14} />
              </button>
            </div>
            <button
              type="button"
              aria-label="Изтрий"
              onClick={() => onDelete(r.id)}
              disabled={busy}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-danger-600 hover:bg-danger-600/10 disabled:opacity-40"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ol>

      {rows.length < 10 && (
        <button
          type="button"
          onClick={onAddMore}
          className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-parchment-200 bg-white px-4 text-sm font-medium text-ink-700 hover:bg-parchment-100"
        >
          + Добави задача ({10 - rows.length} остават)
        </button>
      )}

      <button
        type="button"
        onClick={onPublish}
        disabled={publishing || rows.length !== 10}
        className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700 disabled:opacity-50"
      >
        {publishing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
        {publishing ? 'Публикуване…' : 'Публикувай'}
      </button>
    </div>
  );
}
