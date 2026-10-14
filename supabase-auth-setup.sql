-- ==============================================================================
-- DSA Tracker Pro: Complete Sync, Permissions, and Auto-Approval Script
-- Run this entire script in Supabase SQL Editor:
-- (Supabase Dashboard -> Project baqvmtvwxlqhfoqwkfml -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Ensure user_approvals table exists
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

-- 2. Drop all old restrictive policies
drop policy if exists "Allow user to insert own approval" on public.user_approvals;
drop policy if exists "Allow user to read own approval" on public.user_approvals;
drop policy if exists "Allow master to update approvals" on public.user_approvals;
drop policy if exists "Allow master to select all approvals" on public.user_approvals;
drop policy if exists "Allow master to delete approvals" on public.user_approvals;
drop policy if exists "Master full access to approvals" on public.user_approvals;

-- 3. Install clean, high-performance policies (No auth.users permission errors)
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

-- 4. Auto-confirm all unconfirmed users in auth.users
update auth.users
set email_confirmed_at = now()
where email_confirmed_at is null;

-- 5. SYNC: Automatically copy all existing users from auth.users into user_approvals
-- (This immediately restores your second account so you can approve it!)
insert into public.user_approvals (user_id, email, status, requested_at, updated_at)
select 
  id,
  email,
  case when lower(email) = 'dkvala2003@gmail.com' then 'approved' else 'pending' end,
  coalesce(created_at, now()),
  now()
from auth.users
on conflict (user_id) do update set email = excluded.email;

-- 6. Trigger: Automatically sync ANY future user signups directly into user_approvals
create or replace function public.handle_user_registration_sync()
returns trigger as $$
begin
  -- Auto-confirm email so user never gets stuck
  new.email_confirmed_at = coalesce(new.email_confirmed_at, now());
  
  -- Insert directly into user_approvals
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

-- 7. Ensure notes are transferred to master account (dkvala2003@gmail.com)
alter table public.notes_subjects 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.notes_pages 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

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

-- 8. Clean RLS Policies for notes
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

drop policy if exists "Allow notes to be read by app" on public.notes_pages;
drop policy if exists "Allow note creation from app" on public.notes_pages;
drop policy if exists "Allow note update from app" on public.notes_pages;
drop policy if exists "Allow note delete from app" on public.notes_pages;
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
