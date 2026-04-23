create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table login_images (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  label text,
  created_at timestamptz default now()
);

create table users (
  id uuid primary key default gen_random_uuid(),
  nickname text,
  img_a_id uuid not null references login_images(id),
  img_b_id uuid not null references login_images(id),
  pin_hash text not null,
  created_at timestamptz default now(),
  last_login_at timestamptz,
  unique (img_a_id, img_b_id, pin_hash),
  check (img_a_id < img_b_id)
);

create table login_attempts (
  id bigserial primary key,
  ip text,
  succeeded bool not null,
  attempted_at timestamptz default now()
);
create index on login_attempts (ip, attempted_at desc);

create table quests (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references users(id),
  mode text not null check (mode in ('solo', 'multiplayer', 'treasure_hunt')),
  title text not null,
  description text,
  status text not null default 'published'
    check (status in ('draft', 'published', 'archived')),
  share_token text unique not null,
  time_limit_sec int,
  max_players int default 5,
  created_at timestamptz default now()
);
create index on quests (creator_id);
create index on quests (share_token);

create table quest_source_images (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  storage_path text not null,
  order_idx int not null,
  unique (quest_id, order_idx)
);

create table quest_tasks (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  order_idx int not null,
  title text not null,
  description text not null,
  hidden_criteria text,
  reference_image_path text,
  creator_context text,
  max_points int not null default 10,
  regenerations_used int not null default 0,
  unique (quest_id, order_idx),
  check (
    (hidden_criteria is not null and reference_image_path is null)
    or (hidden_criteria is null and reference_image_path is not null)
  )
);

create table quest_sessions (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  player_id uuid not null references users(id),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned', 'expired')),
  task_order jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '5 days')
);
create index on quest_sessions (player_id, status);
create index on quest_sessions (quest_id);

-- Keep expires_at consistent with started_at on insert/update
create or replace function public.set_quest_session_expires_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.expires_at := new.started_at + interval '5 days';
  return new;
end;
$$;

create trigger trg_quest_sessions_expires_at
before insert or update of started_at on quest_sessions
for each row execute function public.set_quest_session_expires_at();

create table task_submissions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references quest_sessions(id) on delete cascade,
  task_id uuid not null references quest_tasks(id),
  attempt_no int not null check (attempt_no > 0),
  storage_path text not null,
  score int check (score is null or (score >= 0 and score <= 10)),
  is_match bool,
  match_confidence numeric(3,2),
  ai_reasoning text,
  fraud_suspected bool default false,
  fraud_reason text,
  submitted_at timestamptz default now(),
  unique (session_id, task_id, attempt_no)
);

create table multiplayer_rooms (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid not null references quests(id) on delete cascade,
  host_id uuid not null references users(id),
  status text not null default 'lobby'
    check (status in ('lobby', 'in_progress', 'finished', 'cancelled')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz default now()
);
create index on multiplayer_rooms (quest_id, status);

create table room_players (
  room_id uuid not null references multiplayer_rooms(id) on delete cascade,
  player_id uuid not null references users(id),
  session_id uuid not null references quest_sessions(id),
  joined_at timestamptz default now(),
  primary key (room_id, player_id)
);

create or replace view user_session_summary as
select
  s.id                     as session_id,
  s.player_id,
  s.quest_id,
  s.status,
  s.started_at,
  s.completed_at,
  q.title                  as quest_title,
  q.mode,
  q.creator_id,
  (select count(*) from quest_tasks t where t.quest_id = q.id) as total_tasks,
  (select count(distinct sub.task_id) from task_submissions sub
     where sub.session_id = s.id) as submitted_tasks,
  (select coalesce(sum(best_score), 0) from (
     select task_id, max(score) as best_score
     from task_submissions
     where session_id = s.id and score is not null
     group by task_id
   ) x) as total_score,
  extract(epoch from (coalesce(s.completed_at, now()) - s.started_at))::int as duration_sec
from quest_sessions s
join quests q on q.id = s.quest_id;

create or replace view quest_leaderboard as
select
  uss.quest_id,
  uss.session_id,
  uss.player_id,
  u.nickname,
  uss.total_score,
  uss.duration_sec,
  uss.status,
  uss.completed_at,
  row_number() over (
    partition by uss.quest_id
    order by
      (uss.status = 'completed') desc,
      uss.total_score desc,
      uss.duration_sec asc
  ) as rank
from user_session_summary uss
join users u on u.id = uss.player_id
where uss.status in ('completed', 'in_progress')
  and uss.player_id != uss.creator_id;

create or replace view quest_tasks_public as
select id, quest_id, order_idx, title, description, max_points, reference_image_path
from quest_tasks;

grant select on quest_tasks_public to anon, authenticated;