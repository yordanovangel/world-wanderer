import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Trash2, Loader2 } from 'lucide-react';
import type { SessionSummary } from '@/lib/queries/home';
import { formatDuration } from '@/lib/format';
import { ModeIcon } from './ModeIcon';
import { deleteSession } from '@/lib/queries/quests';
import { toast } from '@/hooks/use-toast';

const STATUS_LABEL: Record<SessionSummary['status'], string> = {
  in_progress: 'В ход',
  completed: 'Завършен',
  abandoned: 'Изоставен',
  expired: 'Изтекъл',
};

const STATUS_CLASS: Record<SessionSummary['status'], string> = {
  in_progress: 'bg-ochre-200 text-ochre-700',
  completed: 'bg-forest-200 text-forest-700',
  abandoned: 'bg-parchment-200 text-ink-500',
  expired: 'bg-danger-200 text-danger-600',
};

export function PastSessionRow({
  s,
  onDeleted,
}: {
  s: SessionSummary;
  onDeleted?: (sessionId: string) => void;
}) {
  const isCompleted = s.status === 'completed';
  const canDelete = s.status !== 'in_progress';
  const [deleting, setDeleting] = useState(false);
  const [removed, setRemoved] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canDelete || deleting) return;
    if (!confirm(`Изтрий "${s.quest_title}" от историята? Това действие е необратимо.`)) return;
    setDeleting(true);
    try {
      await deleteSession(s.session_id);
      setRemoved(true);
      onDeleted?.(s.session_id);
      toast({ title: 'Сесията е изтрита' });
    } catch (err: any) {
      toast({
        title: 'Грешка при изтриване',
        description: err?.message,
        variant: 'destructive',
      });
      setDeleting(false);
    }
  };

  if (removed) return null;

  return (
    <div className="flex items-stretch gap-1">
      <Link
        to={`/quest/${s.quest_id}/play`}
        className="flex flex-1 items-center gap-3 rounded-xl border border-parchment-200 bg-white p-3 shadow-soft transition hover:bg-parchment-100"
      >
        <span className="inline-flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-parchment-100 text-forest-700">
          <ModeIcon mode={s.mode} size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-ink-900">{s.quest_title}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[s.status]}`}
          >
            {STATUS_LABEL[s.status]}
          </span>
        </div>
        <div className="text-right font-mono-rq text-sm text-ink-500">
          {isCompleted ? `${s.total_score} т.` : formatDuration(s.duration_sec)}
        </div>
      </Link>
      {canDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          aria-label="Изтрий сесията"
          className="inline-flex w-10 flex-none items-center justify-center rounded-xl border border-parchment-200 bg-white text-ink-500 shadow-soft transition hover:bg-danger-200/40 hover:text-danger-600 disabled:opacity-50"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
        </button>
      )}
    </div>
  );
}
