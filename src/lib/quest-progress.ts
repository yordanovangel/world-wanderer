import type { PublicTask, Submission } from '@/lib/queries/quests';

const MAX_ATTEMPTS = 2;
const PASS_SCORE = 6;

export type TaskState = {
  task: PublicTask;
  attempts: Submission[];
  bestScore: number;
  isFinished: boolean; // passed OR attempts exhausted
};

export type SessionProgress = {
  states: TaskState[];
  currentIndex: number; // index in states[] of the current playable task
  isComplete: boolean;
  totalScore: number;
};

/**
 * Compute per-task progress + pick the current task.
 * Order is enforced: current = first task that is not finished.
 * If task_order is provided on the session, it controls ordering;
 * otherwise tasks are used in order_idx ascending.
 */
export function computeProgress(
  tasks: PublicTask[],
  submissions: Submission[],
  taskOrder?: string[] | null,
): SessionProgress {
  const sorted = orderTasks(tasks, taskOrder);
  const byTask = new Map<string, Submission[]>();
  for (const s of submissions) {
    const arr = byTask.get(s.task_id) ?? [];
    arr.push(s);
    byTask.set(s.task_id, arr);
  }

  const states: TaskState[] = sorted.map((task) => {
    const attempts = (byTask.get(task.id) ?? []).sort(
      (a, b) => a.attempt_no - b.attempt_no,
    );
    const bestScore = attempts.reduce(
      (m, a) => Math.max(m, a.score ?? 0),
      0,
    );
    const isFinished =
      bestScore >= PASS_SCORE || attempts.length >= MAX_ATTEMPTS;
    return { task, attempts, bestScore, isFinished };
  });

  const currentIndex = states.findIndex((s) => !s.isFinished);
  const isComplete = currentIndex === -1;
  const totalScore = states.reduce((sum, s) => sum + s.bestScore, 0);

  return {
    states,
    currentIndex: isComplete ? states.length - 1 : currentIndex,
    isComplete,
    totalScore,
  };
}

function orderTasks(
  tasks: PublicTask[],
  taskOrder?: string[] | null,
): PublicTask[] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  if (taskOrder && taskOrder.length > 0) {
    const ordered: PublicTask[] = [];
    for (const id of taskOrder) {
      const t = byId.get(id);
      if (t) ordered.push(t);
    }
    // Append any tasks missing from task_order at the end, by order_idx
    for (const t of [...tasks].sort((a, b) => a.order_idx - b.order_idx)) {
      if (!taskOrder.includes(t.id)) ordered.push(t);
    }
    return ordered;
  }
  return [...tasks].sort((a, b) => a.order_idx - b.order_idx);
}

export const SOLO_PASS_SCORE = PASS_SCORE;
export const SOLO_MAX_ATTEMPTS = MAX_ATTEMPTS;
