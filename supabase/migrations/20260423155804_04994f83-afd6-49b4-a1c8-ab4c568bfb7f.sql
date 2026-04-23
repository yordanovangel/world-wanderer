-- Enable realtime for multiplayer-relevant tables
ALTER TABLE public.multiplayer_rooms REPLICA IDENTITY FULL;
ALTER TABLE public.room_players REPLICA IDENTITY FULL;
ALTER TABLE public.quest_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.task_submissions REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.multiplayer_rooms;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.room_players;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quest_sessions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Enable RLS (no client-side write policies; service role bypasses RLS).
ALTER TABLE public.multiplayer_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_source_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_images ENABLE ROW LEVEL SECURITY;

-- Public read for lobby/play state. Writes only via service role (edge functions).
DROP POLICY IF EXISTS "rooms public read" ON public.multiplayer_rooms;
CREATE POLICY "rooms public read" ON public.multiplayer_rooms
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "room_players public read" ON public.room_players;
CREATE POLICY "room_players public read" ON public.room_players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "quest_sessions public read" ON public.quest_sessions;
CREATE POLICY "quest_sessions public read" ON public.quest_sessions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "task_submissions public read" ON public.task_submissions;
CREATE POLICY "task_submissions public read" ON public.task_submissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "quests public read" ON public.quests;
CREATE POLICY "quests public read" ON public.quests
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "quest_tasks public read" ON public.quest_tasks;
CREATE POLICY "quest_tasks public read" ON public.quest_tasks
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "quest_source_images public read" ON public.quest_source_images;
CREATE POLICY "quest_source_images public read" ON public.quest_source_images
  FOR SELECT USING (true);

-- For users we expose only nickname-related lookups via the views; allow basic select.
DROP POLICY IF EXISTS "users public read" ON public.users;
CREATE POLICY "users public read" ON public.users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "login_images public read" ON public.login_images;
CREATE POLICY "login_images public read" ON public.login_images
  FOR SELECT USING (true);
