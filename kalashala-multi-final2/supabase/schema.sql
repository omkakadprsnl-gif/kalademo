-- ============================================================
-- KALASHALA - PASSWORD ONLY COURSE ACCESS
-- ============================================================
-- Students do NOT create accounts, provide names, or submit email.
-- They receive the course link + shared password.
-- Supabase anonymous auth supplies a private browser session so
-- access can persist on that device without personal information.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Admin profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student'
    check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Courses
-- ------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Password hash for each course
-- ------------------------------------------------------------
create table if not exists public.course_access (
  course_id uuid primary key references public.courses(id) on delete cascade,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Anonymous browser access grants
-- ------------------------------------------------------------
create table if not exists public.course_access_grants (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);

-- ------------------------------------------------------------
-- Lectures
-- ------------------------------------------------------------
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  position integer not null default 1,
  title text not null,
  description text,
  youtube_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Helpers
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists courses_updated_at on public.courses;
create trigger courses_updated_at
before update on public.courses
for each row execute procedure public.set_updated_at();

drop trigger if exists course_access_updated_at on public.course_access;
create trigger course_access_updated_at
before update on public.course_access
for each row execute procedure public.set_updated_at();

drop trigger if exists lectures_updated_at on public.lectures;
create trigger lectures_updated_at
before update on public.lectures
for each row execute procedure public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_admin()
    or exists (
      select 1
      from public.course_access_grants
      where user_id = auth.uid()
        and course_id = p_course_id
    );
$$;

-- ------------------------------------------------------------
-- Auto-create internal profile for auth users.
-- Anonymous users remain role=student and have no personal data.
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'student')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- Check the shared course password without exposing the hash.
-- ------------------------------------------------------------
create or replace function public.claim_course_access(
  p_course_id uuid default null,
  p_password text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_course_id uuid := p_course_id;
  course_hash text;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in.';
  end if;

  if selected_course_id is null then
    select id
    into selected_course_id
    from public.courses
    order by created_at
    limit 1;
  end if;

  if selected_course_id is null then
    raise exception 'Course not found.';
  end if;

  select password_hash
  into course_hash
  from public.course_access
  where course_id = selected_course_id;

  if course_hash is null then
    raise exception 'Course access has not been configured yet.';
  end if;

  if course_hash <> crypt(coalesce(p_password, ''), course_hash) then
    raise exception 'Incorrect course password.';
  end if;

  insert into public.course_access_grants (user_id, course_id)
  values (auth.uid(), selected_course_id)
  on conflict (user_id, course_id) do nothing;

  return json_build_object(
    'success', true,
    'course_id', selected_course_id
  );
end;
$$;

-- ------------------------------------------------------------
-- Admin course settings
-- ------------------------------------------------------------
create or replace function public.admin_update_course(
  p_course_id uuid,
  p_title text,
  p_description text,
  p_password text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if length(trim(coalesce(p_title, ''))) < 1 then
    raise exception 'Course title is required.';
  end if;

  update public.courses
  set title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''),
      updated_at = now()
  where id = p_course_id;

  if not found then
    raise exception 'Course not found.';
  end if;

  if p_password is not null and trim(p_password) <> '' then
    insert into public.course_access (course_id, password_hash)
    values (p_course_id, crypt(trim(p_password), gen_salt('bf')))
    on conflict (course_id)
    do update set
      password_hash = excluded.password_hash,
      updated_at = now();
  end if;

  return true;
end;
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.course_access enable row level security;
alter table public.course_access_grants enable row level security;
alter table public.lectures enable row level security;

-- Drop old policies from prior builds.
drop policy if exists "profiles own/admin read" on public.profiles;
drop policy if exists "profiles own read" on public.profiles;
drop policy if exists "profiles admin update" on public.profiles;
drop policy if exists "courses authenticated read" on public.courses;
drop policy if exists "courses approved read" on public.courses;
drop policy if exists "courses access read" on public.courses;
drop policy if exists "courses admin write" on public.courses;
drop policy if exists "course access admin" on public.course_access;
drop policy if exists "lectures authenticated read" on public.lectures;
drop policy if exists "lectures access read" on public.lectures;
drop policy if exists "lectures admin write" on public.lectures;
drop policy if exists "access own read" on public.course_access_grants;
drop policy if exists "access admin read" on public.course_access_grants;
drop policy if exists "access admin write" on public.course_access_grants;

-- Profiles are only needed for admin authorization.
create policy "profiles own read"
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy "profiles admin update"
on public.profiles
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Students can read course metadata only after access is granted.
create policy "courses access read"
on public.courses
for select
to authenticated
using (public.has_course_access(id));

create policy "courses admin write"
on public.courses
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Never expose password hashes to students.
create policy "course access admin"
on public.course_access
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Students only see their own internal anonymous grant.
create policy "access own read"
on public.course_access_grants
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "access admin write"
on public.course_access_grants
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "lectures access read"
on public.lectures
for select
to authenticated
using (public.has_course_access(course_id));

create policy "lectures admin write"
on public.lectures
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- ------------------------------------------------------------
-- Keep existing real course data. Create exactly one course only
-- if none exists. Do NOT insert demo lectures or fake YouTube URLs.
-- ------------------------------------------------------------
insert into public.courses (title, description)
select 'Embroidery Course', null
where not exists (select 1 from public.courses);

-- Create a random unusable password until the admin sets the real one.
insert into public.course_access (course_id, password_hash)
select c.id, crypt(gen_random_uuid()::text, gen_salt('bf'))
from public.courses c
where not exists (
  select 1 from public.course_access ca where ca.course_id = c.id
);

-- ------------------------------------------------------------
-- IMPORTANT: disable anonymous self-registration only if you do not
-- want anonymous users to exist. This build NEEDS anonymous sign-ins.
-- In Supabase Dashboard: Authentication -> Providers -> Anonymous
-- Sign-Ins must be enabled.
--
-- Admin setup after creating your admin auth user:
-- update public.profiles
-- set role = 'admin'
-- where id = 'YOUR-ADMIN-USER-UUID';
-- ------------------------------------------------------------
