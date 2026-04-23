ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- intentionally NO policies → only service role (edge functions) can read/write.

ALTER VIEW public.quest_leaderboard SET (security_invoker = true);
ALTER VIEW public.quest_tasks_public SET (security_invoker = true);
ALTER VIEW public.user_session_summary SET (security_invoker = true);
