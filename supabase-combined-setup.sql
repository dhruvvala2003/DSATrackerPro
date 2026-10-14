-- ==============================================================================
-- DSA TRACKER PRO: COMPLETE FIX & SUB-NOTES MIGRATION SCRIPT
-- ==============================================================================
-- SAFE & IDEMPOTENT: 
-- 1. NO DATA IS DELETED (Zero data loss guarantee).
-- 2. Uses DROP POLICY IF EXISTS before creating policies (Fixes ERROR 42710).
-- 3. Avoids auth.users permission errors in RLS.
-- 4. Automatically syncs second account into user_approvals.
-- 5. Auto-confirms all unconfirmed emails.
-- 6. Creates 3-tier sub-notes structure.
-- 7. Migrates all existing pages into a sub-note named identical to parent note.
-- 8. Enables editing/renaming sub-notes.
-- ==============================================================================

-- ==============================================================================
-- PART 1: USER APPROVALS & AUTH FIXES
-- ==============================================================================

-- 1.1 Ensure user_approvals table exists
create table if not exists public.user_approvals (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  email text not null,
  status text not null default 'pending', -- 'pending' | 'approved' | 'blocked' | 'rejected'
  requested_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_user_approvals_user_id on public.user_approvals(user_id);
create index if not exists idx_user_approvals_email on public.user_approvals(email);

alter table public.user_approvals enable row level security;

-- 1.2 Drop all existing policies safely (prevents ERROR 42710)
drop policy if exists "Allow user to insert own approval" on public.user_approvals;
drop policy if exists "Allow user to read own approval" on public.user_approvals;
drop policy if exists "Allow master to update approvals" on public.user_approvals;
drop policy if exists "Allow master to select all approvals" on public.user_approvals;
drop policy if exists "Allow master to delete approvals" on public.user_approvals;
drop policy if exists "Master full access to approvals" on public.user_approvals;

-- 1.3 Create clean policies without querying auth.users table directly
create policy "Allow user to insert own approval"
on public.user_approvals for insert
to anon, authenticated
with check (true);

create policy "Allow master to select all approvals"
on public.user_approvals for select
to authenticated
using (
  lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or auth.uid() = user_id
);

create policy "Allow master to update approvals"
on public.user_approvals for update
to authenticated
using (lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
with check (lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com');

create policy "Allow master to delete approvals"
on public.user_approvals for delete
to authenticated
using (lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com');

-- 1.4 Auto-confirm all unconfirmed users so login never gets blocked
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 1.5 Sync all existing auth users into user_approvals table
insert into public.user_approvals (user_id, email, status, requested_at, updated_at)
select 
  id,
  email,
  case when lower(email) = 'dkvala2003@gmail.com' then 'approved' else 'pending' end,
  coalesce(created_at, now()),
  now()
from auth.users
on conflict (user_id) do update set email = excluded.email;

-- 1.6 Trigger to automatically auto-confirm and register all future signups
create or replace function public.handle_user_registration_sync()
returns trigger as $$
begin
  new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
  
  insert into public.user_approvals (user_id, email, status, requested_at, updated_at)
  values (
    new.id,
    new.email,
    case when lower(new.email) = 'dkvala2003@gmail.com' then 'approved' else 'pending' end,
    now(),
    now()
  )
  on conflict (user_id) do nothing;
  
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_registration on auth.users;
create trigger on_auth_user_registration
  after insert on auth.users
  for each row execute function public.handle_user_registration_sync();

-- ==============================================================================
-- PART 2: SUB-NOTES TABLE SETUP & PERMISSIONS
-- ==============================================================================

-- 2.1 Add user_id column to notes_subjects and notes_pages if missing
alter table public.notes_subjects 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.notes_pages 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- 2.2 Create notes_subnotes table
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

-- 2.3 Add subnote_id foreign key column to notes_pages
alter table public.notes_pages
add column if not exists subnote_id uuid references public.notes_subnotes(id) on delete cascade;

create index if not exists idx_notes_pages_subnote_id on public.notes_pages(subnote_id);

-- 2.4 Transfer existing notes ownership to master account
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

-- 2.5 RLS Policies for notes_subjects
drop policy if exists "Allow subjects to be read by app" on public.notes_subjects;
drop policy if exists "Allow subject creation from app" on public.notes_subjects;
drop policy if exists "Allow subject delete from app" on public.notes_subjects;
drop policy if exists "Users can view own subjects" on public.notes_subjects;
drop policy if exists "Users can insert own subjects" on public.notes_subjects;
drop policy if exists "Users can update own subjects" on public.notes_subjects;
drop policy if exists "Users can delete own subjects" on public.notes_subjects;

create policy "Users can view own subjects"
on public.notes_subjects for select to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

create policy "Users can insert own subjects"
on public.notes_subjects for insert to authenticated
with check (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can update own subjects"
on public.notes_subjects for update to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
)
with check (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can delete own subjects"
on public.notes_subjects for delete to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

-- 2.6 RLS Policies for notes_subnotes
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

-- 2.7 RLS Policies for notes_pages
drop policy if exists "Allow pages to be read by app" on public.notes_pages;
drop policy if exists "Allow page creation from app" on public.notes_pages;
drop policy if exists "Allow page update from app" on public.notes_pages;
drop policy if exists "Allow page delete from app" on public.notes_pages;
drop policy if exists "Users can view own pages" on public.notes_pages;
drop policy if exists "Users can insert own pages" on public.notes_pages;
drop policy if exists "Users can update own pages" on public.notes_pages;
drop policy if exists "Users can delete own pages" on public.notes_pages;

create policy "Users can view own pages"
on public.notes_pages for select to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

create policy "Users can insert own pages"
on public.notes_pages for insert to authenticated
with check (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can update own pages"
on public.notes_pages for update to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
)
with check (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can delete own pages"
on public.notes_pages for delete to authenticated
using (
  auth.uid() = user_id 
  or lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and lower(auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

-- ==============================================================================
-- PART 3: SAFE ZERO-DATA-LOSS MIGRATION
-- Moves all existing pages into a sub-note named identical to parent note!
-- ==============================================================================

-- 3.1 Create a matching sub-note for every parent note (name matches parent note)
insert into public.notes_subnotes (id, subject_id, name, user_id, created_at, updated_at)
select 
  gen_random_uuid(),
  s.id,
  s.name, -- Same name as parent note!
  s.user_id,
  s.created_at,
  now()
from public.notes_subjects s
where not exists (
  select 1 from public.notes_subnotes sn where sn.subject_id = s.id
);

-- 3.2 Move all existing pages into their parent note's matching sub-note
update public.notes_pages p
set subnote_id = (
  select sn.id from public.notes_subnotes sn 
  where sn.subject_id = p.subject_id 
  order by sn.created_at asc 
  limit 1
)
where p.subnote_id is null;

-- ==============================================================================
-- PART 4: VERIFICATION REPORT
-- Displays all your parent notes, their sub-notes, and preserved page counts
-- ==============================================================================
select 
  s.name as parent_note,
  sn.name as sub_note,
  count(p.id) as preserved_page_count
from public.notes_subjects s
join public.notes_subnotes sn on sn.subject_id = s.id
left join public.notes_pages p on p.subnote_id = sn.id
group by s.name, sn.name
order by s.name;
