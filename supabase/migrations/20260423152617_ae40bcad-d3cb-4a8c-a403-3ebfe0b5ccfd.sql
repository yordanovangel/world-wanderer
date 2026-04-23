-- Create buckets
insert into storage.buckets (id, name, public) values
  ('login-images', 'login-images', true),
  ('quest-sources', 'quest-sources', false),
  ('task-references', 'task-references', false),
  ('task-submissions', 'task-submissions', false)
on conflict (id) do nothing;

-- Public read for login-images bucket
create policy "Public read login-images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'login-images');

-- All other buckets: no anon/authenticated policies, so only service role
-- (used by Edge Functions) can read/write. This is intentional.