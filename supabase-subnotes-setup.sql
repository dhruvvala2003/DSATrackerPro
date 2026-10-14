-- ==============================================================================
-- DSA Tracker Pro: Safe Sub-notes Creation & Existing Pages Migration
-- Run this in your Supabase SQL Editor:
-- (Supabase Dashboard -> Project baqvmtvwxlqhfoqwkfml -> SQL Editor -> New Query)
-- ==============================================================================

-- STEP 1: Safe Table & Column Additions (NO DATA IS DELETED)
create table if not exists public.notes_subnotes (
  id uuid default gen_random_uuid() primary key,
  subject_id uuid references public.notes_subjects(id) on delete cascade not null,
  name text not null,
  description text,
  user_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_notes_subnotes_subject_id on public.notes_subnotes(subject_id);
create index if not exists idx_notes_subnotes_user_id on public.notes_subnotes(user_id);

alter table public.notes_subnotes enable row level security;

-- Add subnote_id to existing pages table (preserves all existing rows & columns)
alter table public.notes_pages
add column if not exists subnote_id uuid references public.notes_subnotes(id) on delete cascade;

create index if not exists idx_notes_pages_subnote_id on public.notes_pages(subnote_id);

-- STEP 2: Ensure Master Account Ownership (dkvala2003@gmail.com owns all existing notes)
do $$
declare
  master_uid uuid;
begin
  select id into master_uid from auth.users where lower(email) = 'dkvala2003@gmail.com' limit 1;
  if master_uid is not null then
    update public.notes_subjects set user_id = master_uid where user_id is null;
    update public.notes_pages set user_id = master_uid where user_id is null;
  end if;
end $$;

-- STEP 3: RLS Policies for notes_subnotes (Full Master Access & Scoped User Privacy)
drop policy if exists "Users can view own subnotes" on public.notes_subnotes;
drop policy if exists "Users can insert own subnotes" on public.notes_subnotes;
drop policy if exists "Users can update own subnotes" on public.notes_subnotes;
drop policy if exists "Users can delete own subnotes" on public.notes_subnotes;

create policy "Users can view own subnotes"
on public.notes_subnotes for select to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

create policy "Users can insert own subnotes"
on public.notes_subnotes for insert to authenticated
with check (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can update own subnotes"
on public.notes_subnotes for update to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
)
with check (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can delete own subnotes"
on public.notes_subnotes for delete to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

-- ==============================================================================
-- STEP 4: MIGRATE EXISTING DATA
-- Creates a sub-note with the EXACT SAME NAME as the parent note,
-- and attaches all existing pages inside it!
-- ==============================================================================

-- A. Create matching sub-note for every parent note
insert into public.notes_subnotes (id, subject_id, name, user_id, created_at, updated_at)
select 
  gen_random_uuid(),
  s.id,
  s.name, -- Same name as the parent note!
  s.user_id,
  s.created_at,
  now()
from public.notes_subjects s
where not exists (
  select 1 from public.notes_subnotes sn where sn.subject_id = s.id
);

-- B. Move all existing pages into their parent note's matching sub-note
update public.notes_pages p
set subnote_id = (
  select sn.id from public.notes_subnotes sn 
  where sn.subject_id = p.subject_id 
  order by sn.created_at asc 
  limit 1
)
where p.subnote_id is null;

-- ==============================================================================
-- STEP 5: VERIFICATION CHECK
-- Shows your parent notes, matching sub-notes, and page counts:
-- ==============================================================================
select 
  s.name as parent_note,
  sn.name as sub_note,
  count(p.id) as total_pages_preserved
from public.notes_subjects s
join public.notes_subnotes sn on sn.subject_id = s.id
left join public.notes_pages p on p.subnote_id = sn.id
group by s.name, sn.name
order by s.name;
