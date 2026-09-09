-- The current app has no sign-in screen, so the /admin/add route uses Supabase's
-- anonymous client. This policy allows that route to create non-empty topics.
-- For a private production admin, replace `anon, authenticated` with `authenticated`
-- and add an authentication flow before enabling the route.

alter table public.topics enable row level security;
alter table public.subtopics enable row level security;
alter table public.problems enable row level security;

alter table public.problems add column if not exists brute_force_code text;
alter table public.problems add column if not exists good_approach_code text;
alter table public.problems add column if not exists optimal_approach_code text;
alter table public.problems add column if not exists code_snippet text;
alter table public.problems add column if not exists companies text[] default '{}'::text[];

update public.problems
set optimal_approach_code = code_snippet
where optimal_approach_code is null and code_snippet is not null;

drop policy if exists "Allow topic creation from app" on public.topics;

create policy "Allow topic creation from app"
on public.topics
for insert
to anon, authenticated
with check (
  name is not null
  and char_length(trim(name)) > 0
);

drop policy if exists "Allow topics to be read by app" on public.topics;
create policy "Allow topics to be read by app" on public.topics for select to anon, authenticated using (true);

drop policy if exists "Allow subtopics to be read by app" on public.subtopics;
create policy "Allow subtopics to be read by app" on public.subtopics for select to anon, authenticated using (true);

drop policy if exists "Allow subtopic creation from app" on public.subtopics;
create policy "Allow subtopic creation from app" on public.subtopics for insert to anon, authenticated
with check (topic_id is not null and name is not null and char_length(trim(name)) > 0);

drop policy if exists "Allow problems to be read by app" on public.problems;
create policy "Allow problems to be read by app" on public.problems for select to anon, authenticated using (true);

drop policy if exists "Allow problem creation from app" on public.problems;
create policy "Allow problem creation from app" on public.problems for insert to anon, authenticated
with check (subtopic_id is not null and title is not null and char_length(trim(title)) > 0);

drop policy if exists "Allow problem update from app" on public.problems;
create policy "Allow problem update from app" on public.problems for update to anon, authenticated
using (true)
with check (subtopic_id is not null and title is not null and char_length(trim(title)) > 0);

drop policy if exists "Allow problem delete from app" on public.problems;
create policy "Allow problem delete from app" on public.problems for delete to anon, authenticated using (true);
