-- ============================================================
-- LOCK quest_tasks (sensitive: hidden_criteria, creator_context)
-- ============================================================
alter table public.quest_tasks enable row level security;

drop policy if exists "quest_tasks public read" on public.quest_tasks;
drop policy if exists "block all direct access" on public.quest_tasks;
create policy "block all direct access" on public.quest_tasks for all using (false) with check (false);

-- Re-create the public view (drops & re-grants are safe-idempotent)
create or replace view public.quest_tasks_public as
select id, quest_id, order_idx, title, description, max_points, reference_image_path
from public.quest_tasks;
grant select on public.quest_tasks_public to anon, authenticated;

-- ============================================================
-- LOCK users table; expose users_public view (no pin_hash)
-- ============================================================
alter table public.users enable row level security;

drop policy if exists "users public read" on public.users;
drop policy if exists "read own or public nickname" on public.users;
drop policy if exists "no direct writes" on public.users;
drop policy if exists "no direct updates" on public.users;
drop policy if exists "no direct deletes" on public.users;

create policy "block all direct access" on public.users for all using (false) with check (false);

create or replace view public.users_public as
select id, nickname, created_at, last_login_at from public.users;
grant select on public.users_public to anon, authenticated;

-- ============================================================
-- LOCK login_attempts — internal only
-- ============================================================
alter table public.login_attempts enable row level security;
drop policy if exists "block all access" on public.login_attempts;
create policy "block all access" on public.login_attempts for all using (false) with check (false);

-- ============================================================
-- quests — read OK; mutations blocked from client
-- ============================================================
alter table public.quests enable row level security;
drop policy if exists "quests public read" on public.quests;
drop policy if exists "read all quests" on public.quests;
drop policy if exists "no direct writes on quests" on public.quests;
drop policy if exists "no direct updates on quests" on public.quests;
drop policy if exists "no direct deletes on quests" on public.quests;

create policy "read all quests" on public.quests for select using (true);
create policy "no direct writes on quests" on public.quests for insert with check (false);
create policy "no direct updates on quests" on public.quests for update using (false) with check (false);
create policy "no direct deletes on quests" on public.quests for delete using (false);

-- ============================================================
-- quest_source_images
-- ============================================================
alter table public.quest_source_images enable row level security;
drop policy if exists "quest_source_images public read" on public.quest_source_images;
drop policy if exists "read all sources" on public.quest_source_images;
drop policy if exists "no direct writes sources" on public.quest_source_images;

create policy "read all sources" on public.quest_source_images for select using (true);
create policy "no direct writes sources" on public.quest_source_images for insert with check (false);
create policy "no direct updates sources" on public.quest_source_images for update using (false) with check (false);
create policy "no direct deletes sources" on public.quest_source_images for delete using (false);

-- ============================================================
-- quest_sessions
-- ============================================================
alter table public.quest_sessions enable row level security;
drop policy if exists "quest_sessions public read" on public.quest_sessions;
drop policy if exists "read sessions" on public.quest_sessions;
drop policy if exists "no direct writes sessions" on public.quest_sessions;
drop policy if exists "no direct updates sessions" on public.quest_sessions;

create policy "read sessions" on public.quest_sessions for select using (true);
create policy "no direct writes sessions" on public.quest_sessions for insert with check (false);
create policy "no direct updates sessions" on public.quest_sessions for update using (false) with check (false);
create policy "no direct deletes sessions" on public.quest_sessions for delete using (false);

-- ============================================================
-- task_submissions
-- ============================================================
alter table public.task_submissions enable row level security;
drop policy if exists "task_submissions public read" on public.task_submissions;
drop policy if exists "read submissions" on public.task_submissions;
drop policy if exists "no direct writes submissions" on public.task_submissions;

create policy "read submissions" on public.task_submissions for select using (true);
create policy "no direct writes submissions" on public.task_submissions for insert with check (false);
create policy "no direct updates submissions" on public.task_submissions for update using (false) with check (false);
create policy "no direct deletes submissions" on public.task_submissions for delete using (false);

-- ============================================================
-- multiplayer_rooms + room_players
-- ============================================================
alter table public.multiplayer_rooms enable row level security;
drop policy if exists "rooms public read" on public.multiplayer_rooms;
drop policy if exists "read rooms" on public.multiplayer_rooms;
drop policy if exists "no direct writes rooms" on public.multiplayer_rooms;
drop policy if exists "no direct updates rooms" on public.multiplayer_rooms;

create policy "read rooms" on public.multiplayer_rooms for select using (true);
create policy "no direct writes rooms" on public.multiplayer_rooms for insert with check (false);
create policy "no direct updates rooms" on public.multiplayer_rooms for update using (false) with check (false);
create policy "no direct deletes rooms" on public.multiplayer_rooms for delete using (false);

alter table public.room_players enable row level security;
drop policy if exists "room_players public read" on public.room_players;
drop policy if exists "read room players" on public.room_players;
drop policy if exists "no direct writes room players" on public.room_players;

create policy "read room players" on public.room_players for select using (true);
create policy "no direct writes room players" on public.room_players for insert with check (false);
create policy "no direct updates room players" on public.room_players for update using (false) with check (false);
create policy "no direct deletes room players" on public.room_players for delete using (false);
