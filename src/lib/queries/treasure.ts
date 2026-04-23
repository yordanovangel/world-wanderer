import { invokeFn } from '@/lib/fn';

export type DraftQuest = { quest_id: string; share_token: string };

export type TreasureTask = {
  task_id: string;
  order_idx: number;
  hint: string;
  regenerations_remaining: number;
};

export async function createTreasureDraft(title?: string): Promise<DraftQuest> {
  return invokeFn('create-treasure-hunt-draft', { title });
}

export async function addTreasureTask(input: {
  quest_id: string;
  reference_path: string;
  creator_context: string;
}): Promise<TreasureTask> {
  return invokeFn('add-treasure-task', input);
}

export async function regenerateTreasureHint(input: {
  task_id: string;
  creator_context?: string;
}): Promise<{ hint: string; regenerations_remaining: number }> {
  return invokeFn('regenerate-treasure-hint', input);
}

export async function deleteTreasureTask(task_id: string): Promise<{ ok: true }> {
  return invokeFn('delete-treasure-task', { task_id });
}

export async function reorderTreasureTasks(input: {
  quest_id: string;
  ordered_task_ids: string[];
}): Promise<{ ok: true }> {
  return invokeFn('reorder-treasure-task', input);
}

export async function publishQuest(quest_id: string): Promise<{ quest_id: string; share_token: string }> {
  return invokeFn('publish-quest', { quest_id });
}

export async function compareTreasureSubmission(input: {
  session_id: string;
  task_id: string;
  submission_path: string;
}): Promise<{
  match: boolean;
  user_hint: string;
  attempt_no: number;
  session_completed: boolean;
}> {
  return invokeFn('compare-treasure-submission', input);
}
