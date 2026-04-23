import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Loader2, RefreshCcw, Sparkles } from 'lucide-react';
import { CameraCapture } from '@/components/CameraCapture';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
  addTreasureTask,
  createTreasureDraft,
  regenerateTreasureHint,
} from '@/lib/queries/treasure';

const TOTAL_TASKS = 10;
const DRAFT_KEY = 'rq_treasure_draft_id';

type Phase = 'capture' | 'context' | 'preview';

type LocalTask = {
  task_id?: string;
  order_idx: number;
  reference_path?: string;
  reference_preview?: string; // blob URL
  creator_context: string;
  hint?: string;
  regenerations_remaining: number;
  phase: Phase;
};

function emptyTasks(): LocalTask[] {
  return Array.from({ length: TOTAL_TASKS }, (_, i) => ({
    order_idx: i + 1,
    creator_context: '',
    regenerations_remaining: 3,
    phase: 'capture' as Phase,
  }));
}

export default function TreasureWizardPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [questId, setQuestId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<LocalTask[]>(emptyTasks);
  const [step, setStep] = useState<number>(() => {
    const s = parseInt(params.get('step') ?? '0', 10);
    return Number.isFinite(s) && s >= 0 && s <= TOTAL_TASKS ? s : 0;
  });
  const [busy, setBusy] = useState(false);
  const { upload } = useImageUpload('task_reference');

  // Create draft on mount (or reuse existing from URL/storage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const fromUrl = params.get('quest');
      const fromStorage = sessionStorage.getItem(DRAFT_KEY);
      const existing = fromUrl || fromStorage;
      if (existing) {
        if (!cancelled) setQuestId(existing);
        return;
      }
      try {
        const draft = await createTreasureDraft();
        if (cancelled) return;
        sessionStorage.setItem(DRAFT_KEY, draft.quest_id);
        setQuestId(draft.quest_id);
        setParams((p) => {
          p.set('quest', draft.quest_id);
          return p;
        }, { replace: true });
      } catch (e: any) {
        toast({ title: 'Не успяхме да създадем чернова', description: e?.message, variant: 'destructive' });
        navigate('/create', { replace: true });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateTask = (idx: number, patch: Partial<LocalTask>) => {
    setTasks((t) => t.map((x, i) => (i === idx ? { ...x, ...patch } : x)));
  };

  const completedCount = useMemo(() => tasks.filter((t) => !!t.task_id).length, [tasks]);

  const goStep = (n: number) => {
    setStep(n);
    setParams((p) => { p.set('step', String(n)); return p; }, { replace: true });
  };

  // STEP 0 → intro
  if (step === 0) {
    return (
      <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
        <Link to="/create" className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900">
          <ArrowLeft size={16} /> Назад
        </Link>
        <header className="mt-6 text-center">
          <Sparkles size={36} className="mx-auto text-terracotta-500" />
          <h1 className="mt-3 font-display text-[28px] leading-tight text-ink-900">Създай treasure hunt</h1>
          <p className="mt-3 text-base text-ink-700">
            Ти ще снимаш 10 реални обекта. AI ще направи интересни подсказки за всеки.
            Твоите приятели ще трябва да ги намерят по подсказките.
          </p>
        </header>
        <button
          type="button"
          onClick={() => goStep(1)}
          disabled={!questId}
          className="mt-10 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700 disabled:opacity-50"
        >
          {questId ? 'Започни' : 'Подготвяме…'}
        </button>
      </div>
    );
  }

  // STEP TOTAL_TASKS+1 → preview screen (handled by separate route, but in-page for simplicity)
  if (step > TOTAL_TASKS) {
    if (questId) {
      navigate(`/create/treasure/preview?quest=${questId}`, { replace: true });
    }
    return null;
  }

  const taskIdx = step - 1;
  const task = tasks[taskIdx];

  const phase: Phase = task.phase;

  // Phase A: capture reference photo
  const onCapture = async (blob: Blob) => {
    if (!questId) return;
    const previewUrl = URL.createObjectURL(blob);
    updateTask(taskIdx, { reference_preview: previewUrl, phase: 'capture' });
    setBusy(true);
    try {
      const { storage_path } = await upload(blob, { quest_id: questId });
      updateTask(taskIdx, { reference_path: storage_path, phase: 'context' });
    } catch (e: any) {
      toast({ title: 'Качването неуспешно', description: e?.message, variant: 'destructive' });
      URL.revokeObjectURL(previewUrl);
      updateTask(taskIdx, { reference_preview: undefined });
    } finally {
      setBusy(false);
    }
  };

  // Phase B → C: generate hint
  const onGenerateHint = async () => {
    if (!questId || !task.reference_path) return;
    if (task.creator_context.trim().length < 3) {
      toast({ title: 'Опиши обекта', description: 'Поне 3 символа.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const result = await addTreasureTask({
        quest_id: questId,
        reference_path: task.reference_path,
        creator_context: task.creator_context.trim(),
      });
      updateTask(taskIdx, {
        task_id: result.task_id,
        hint: result.hint,
        regenerations_remaining: result.regenerations_remaining,
        phase: 'preview',
      });
    } catch (e: any) {
      toast({ title: 'Не успяхме да генерираме подсказка', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const onRegenerate = async () => {
    if (!task.task_id || task.regenerations_remaining <= 0) return;
    setBusy(true);
    try {
      const result = await regenerateTreasureHint({ task_id: task.task_id });
      updateTask(taskIdx, {
        hint: result.hint,
        regenerations_remaining: result.regenerations_remaining,
      });
    } catch (e: any) {
      toast({ title: 'Не успяхме да регенерираме', description: e?.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const onAcceptHint = () => {
    if (taskIdx + 1 < TOTAL_TASKS) {
      goStep(step + 1);
    } else {
      // All 10 done → preview
      if (questId) navigate(`/create/treasure/preview?quest=${questId}`);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-5 pb-10 pt-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 1 ? goStep(0) : goStep(step - 1))}
          className="inline-flex items-center gap-1 text-sm text-ink-500 hover:text-ink-900"
        >
          <ArrowLeft size={16} /> Назад
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-500">
          Задача {step} от {TOTAL_TASKS}
        </span>
      </div>

      {/* Progress dots */}
      <div className="mt-4 flex justify-center gap-1.5">
        {Array.from({ length: TOTAL_TASKS }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full ${
              i < taskIdx ? 'bg-terracotta-500' : i === taskIdx ? 'bg-terracotta-700' : 'bg-parchment-200'
            }`}
          />
        ))}
      </div>

      {/* Phase A — capture */}
      {phase === 'capture' && (
        <section className="mt-8 text-center">
          <h1 className="font-display text-[22px] text-ink-900">Задача {step}: Снимай обекта</h1>
          <p className="mt-2 text-sm text-ink-500">Заснеми точно това, което приятелите ти трябва да намерят.</p>
          <div className="mt-8 flex justify-center">
            <CameraCapture onCapture={onCapture} disabled={busy} label="Снимай обекта" />
          </div>
        </section>
      )}

      {/* Phase B — context */}
      {phase === 'context' && (
        <section className="mt-8">
          {task.reference_preview && (
            <img
              src={task.reference_preview}
              alt="Референтна снимка"
              className="mx-auto h-40 w-40 rounded-xl object-cover shadow-soft"
            />
          )}
          <label className="mt-6 block text-sm font-medium text-ink-900">
            Опиши накратко какво е това, за да AI разбере
          </label>
          <Textarea
            value={task.creator_context}
            onChange={(e) => updateTask(taskIdx, { creator_context: e.target.value })}
            placeholder="напр. „синята пейка до фонтана пред офиса"
            rows={3}
            className="mt-2"
          />
          <button
            type="button"
            onClick={onGenerateHint}
            disabled={busy || task.creator_context.trim().length < 3}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700 disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
            {busy ? 'Генериране…' : 'Генерирай подсказка'}
          </button>
          <button
            type="button"
            onClick={() => updateTask(taskIdx, { phase: 'capture', reference_path: undefined })}
            className="mt-3 w-full text-sm text-ink-500 hover:text-ink-900"
          >
            ← Снимай отново
          </button>
        </section>
      )}

      {/* Phase C — hint preview */}
      {phase === 'preview' && task.hint && (
        <section className="mt-8">
          {task.reference_preview && (
            <img
              src={task.reference_preview}
              alt="Референтна снимка"
              className="mx-auto h-32 w-32 rounded-xl object-cover shadow-soft"
            />
          )}
          <article className="mt-6 rounded-2xl border-l-4 border-terracotta-500 bg-parchment-50 p-5 shadow-soft">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">Подсказка</p>
            <p className="mt-2 text-base text-ink-900">{task.hint}</p>
          </article>

          <button
            type="button"
            onClick={onAcceptHint}
            className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-terracotta-500 px-4 text-base font-semibold text-parchment-50 shadow-soft hover:bg-terracotta-700"
          >
            <ArrowRight size={18} /> Приеми
          </button>

          <button
            type="button"
            onClick={onRegenerate}
            disabled={busy || task.regenerations_remaining <= 0}
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-parchment-200 bg-white px-4 text-sm font-medium text-ink-700 hover:bg-parchment-100 disabled:opacity-50"
          >
            <RefreshCcw size={14} />
            {task.regenerations_remaining > 0
              ? `Регенерирай (остават ${task.regenerations_remaining})`
              : 'Няма повече опити'}
          </button>

          <button
            type="button"
            onClick={() => updateTask(taskIdx, { phase: 'context' })}
            className="mt-2 w-full text-sm text-ink-500 hover:text-ink-900"
          >
            ← Промени описанието
          </button>
        </section>
      )}

      <p className="mt-8 text-center text-xs text-ink-500">
        Завършени: {completedCount}/{TOTAL_TASKS}
      </p>
    </div>
  );
}
