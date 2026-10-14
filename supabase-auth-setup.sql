-- ==============================================================================
-- DSA Tracker Pro: Complete Auth, Approvals & Zero-Data-Loss Migration Setup
-- Run this entire script in your Supabase SQL Editor:
-- (Supabase Dashboard -> Project baqvmtvwxlqhfoqwkfml -> SQL Editor -> New Query)
-- ==============================================================================

-- ==============================================================================
-- 1. Create user_approvals table
-- ==============================================================================
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

-- Policies for user_approvals
drop policy if exists "Allow user to insert own approval" on public.user_approvals;
drop policy if exists "Allow user to read own approval" on public.user_approvals;
drop policy if exists "Allow master to update approvals" on public.user_approvals;
drop policy if exists "Allow master to select all approvals" on public.user_approvals;

create policy "Allow user to insert own approval"
on public.user_approvals for insert to anon, authenticated
with check (true);

create policy "Allow user to read own approval"
on public.user_approvals for select to anon, authenticated
using (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or email = (auth.jwt() ->> 'email')
);

create policy "Allow master to update approvals"
on public.user_approvals for update to authenticated
using (
  (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or auth.uid() in (select id from auth.users where email = 'dkvala2003@gmail.com')
)
with check (
  (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or auth.uid() in (select id from auth.users where email = 'dkvala2003@gmail.com')
);

create policy "Allow master to select all approvals"
on public.user_approvals for select to authenticated
using (
  (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or auth.uid() in (select id from auth.users where email = 'dkvala2003@gmail.com')
);

-- ==============================================================================
-- 2. SAFE COLUMN ADDITION (Zero data loss, preserves all existing rows and data)
-- ==============================================================================
alter table public.notes_subjects 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.notes_pages 
add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_notes_subjects_user_id on public.notes_subjects(user_id);
create index if not exists idx_notes_pages_user_id on public.notes_pages(user_id);

-- ==============================================================================
-- 3. Automatic Master Account Setup Function & Trigger
-- Automatically claims all existing notes and auto-approves dkvala2003@gmail.com
-- the instant dkvala2003@gmail.com signs up or signs in!
-- ==============================================================================
create or replace function public.handle_master_account_setup()
returns trigger as $$
begin
  if new.email = 'dkvala2003@gmail.com' then
    -- 1. Auto-approve master account
    insert into public.user_approvals (user_id, email, status, requested_at, updated_at)
    values (new.id, new.email, 'approved', now(), now())
    on conflict (user_id) do update set status = 'approved', updated_at = now();

    -- 2. Transfer all existing unassigned subjects to master account
    update public.notes_subjects
    set user_id = new.id
    where user_id is null;

    -- 3. Transfer all existing unassigned pages to master account
    update public.notes_pages
    set user_id = new.id
    where user_id is null;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created_master on auth.users;
create trigger on_auth_user_created_master
  after insert on auth.users
  for each row execute function public.handle_master_account_setup();

-- Immediate transfer if dkvala2003@gmail.com is ALREADY signed up in auth.users:
do $$
declare
  master_uid uuid;
begin
  select id into master_uid from auth.users where email = 'dkvala2003@gmail.com' limit 1;
  
  if master_uid is not null then
    -- Transfer subjects
    update public.notes_subjects
    set user_id = master_uid
    where user_id is null;

    -- Transfer pages
    update public.notes_pages
    set user_id = master_uid
    where user_id is null;

    -- Ensure approved in user_approvals
    insert into public.user_approvals (user_id, email, status, requested_at, updated_at)
    values (master_uid, 'dkvala2003@gmail.com', 'approved', now(), now())
    on conflict (user_id) do update set status = 'approved', updated_at = now();
    
    raise notice 'Successfully transferred all existing notes to master user ID: %', master_uid;
  else
    raise notice 'Master account dkvala2003@gmail.com is not yet in auth.users. The automatic trigger will claim all data as soon as you sign up!';
  end if;
end $$;

-- ==============================================================================
-- 4. RLS Policies for Complete Privacy + Guaranteed Master Account Access
-- (dkvala2003@gmail.com can ALWAYS access all existing and legacy data)
-- ==============================================================================

-- Drop old policies on notes_subjects
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
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

create policy "Users can insert own subjects"
on public.notes_subjects for insert to authenticated
with check (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can update own subjects"
on public.notes_subjects for update to authenticated
using (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
)
with check (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can delete own subjects"
on public.notes_subjects for delete to authenticated
using (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

-- Drop old policies on notes_pages
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
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

create policy "Users can insert own pages"
on public.notes_pages for insert to authenticated
with check (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can update own pages"
on public.notes_pages for update to authenticated
using (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
)
with check (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
);

create policy "Users can delete own pages"
on public.notes_pages for delete to authenticated
using (
  auth.uid() = user_id 
  or (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com'
  or (user_id is null and (auth.jwt() ->> 'email') = 'dkvala2003@gmail.com')
);

-- Storage bucket access
drop policy if exists "Allow notes media to be read by app" on storage.objects;
create policy "Allow notes media to be read by app" on storage.objects for select to authenticated, anon
using (bucket_id = 'notes-media');

drop policy if exists "Allow notes media upload from app" on storage.objects;
create policy "Allow notes media upload from app" on storage.objects for insert to authenticated
with check (bucket_id = 'notes-media');
