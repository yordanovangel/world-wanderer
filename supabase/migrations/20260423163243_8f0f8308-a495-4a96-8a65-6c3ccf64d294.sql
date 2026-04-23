-- Switch all public views to security invoker so the linter is satisfied
alter view public.users_public set (security_invoker = true);
alter view public.quest_tasks_public set (security_invoker = true);
alter view public.quest_leaderboard set (security_invoker = true);
alter view public.user_session_summary set (security_invoker = true);

-- ============================================================
-- users: allow reading non-sensitive columns; pin_hash stays hidden via column GRANT
-- ============================================================
drop policy if exists "block all direct access" on public.users;
create policy "read users (column-restricted)" on public.users for select using (true);
create policy "no direct writes users" on public.users for insert with check (false);
create policy "no direct updates users" on public.users for update using (false) with check (false);
create policy "no direct deletes users" on public.users for delete using (false);

revoke select on public.users from anon, authenticated;
grant select (id, nickname, created_at, last_login_at, img_a_id, img_b_id) on public.users to anon, authenticated;
-- Note: pin_hash is intentionally excluded.

-- ============================================================
-- quest_tasks: allow reading the public-safe columns; hidden_criteria/creator_context stay hidden
-- ============================================================
drop policy if exists "block all direct access" on public.quest_tasks;
create policy "read quest_tasks (column-restricted)" on public.quest_tasks for select using (true);
create policy "no direct writes quest_tasks" on public.quest_tasks for insert with check (false);
create policy "no direct updates quest_tasks" on public.quest_tasks for update using (false) with check (false);
create policy "no direct deletes quest_tasks" on public.quest_tasks for delete using (false);

revoke select on public.quest_tasks from anon, authenticated;
grant select (id, quest_id, order_idx, title, description, max_points, reference_image_path, regenerations_used) on public.quest_tasks to anon, authenticated;
-- Note: hidden_criteria and creator_context are intentionally excluded.
