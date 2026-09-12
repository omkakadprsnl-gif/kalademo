-- ============================================================
-- KALASHALA - MULTI COURSE ACCESS
--
-- Keeps the existing courses/lectures. Adds:
--   1. One password per course.
--   2. Admin course creation.
--   3. Server-side verification for a specific course.
--
-- Students do not create accounts and do not select a course
-- after login. The password is checked against the course they
-- clicked before a signed course-specific access cookie is issued.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Admin: create a course and its password.
-- ------------------------------------------------------------
drop function if exists public.admin_create_course(text, text, text);

create or replace function public.admin_create_course(
  p_title text,
  p_description text default null,
  p_password text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  new_course_id uuid;
  existing_access record;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if length(trim(coalesce(p_title, ''))) < 1 then
    raise exception 'Course title is required.';
  end if;

  if length(trim(coalesce(p_password, ''))) < 1 then
    raise exception 'A student password is required.';
  end if;

  for existing_access in
    select password_hash
    from public.course_access
  loop
    if existing_access.password_hash = extensions.crypt(trim(p_password), existing_access.password_hash) then
      raise exception 'That password is already assigned to another course.';
    end if;
  end loop;

  insert into public.courses (title, description)
  values (
    trim(p_title),
    nullif(trim(coalesce(p_description, '')), '')
  )
  returning id into new_course_id;

  insert into public.course_access (course_id, password_hash)
  values (
    new_course_id,
    extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
  );

  return new_course_id;
end;
$$;

grant execute on function public.admin_create_course(text, text, text) to authenticated;

-- ------------------------------------------------------------
-- Server-side password check for one specific course.
-- ------------------------------------------------------------
drop function if exists public.verify_course_password(uuid, text);
drop function if exists public.verify_course_password(text);

create or replace function public.verify_course_password(
  p_course_id uuid,
  p_password text
)
returns boolean
language plpgsql
security definer
stable
set search_path = public, extensions
as $$
declare
  stored_hash text;
begin
  if p_course_id is null then
    return false;
  end if;

  select password_hash
  into stored_hash
  from public.course_access
  where course_id = p_course_id;

  if stored_hash is null then
    return false;
  end if;

  return stored_hash = extensions.crypt(coalesce(p_password, ''), stored_hash);
end;
$$;

grant execute on function public.verify_course_password(uuid, text) to anon, authenticated;

-- ------------------------------------------------------------
-- Make sure every existing course has a password row.
-- Existing real passwords remain unchanged.
-- ------------------------------------------------------------
insert into public.course_access (course_id, password_hash)
select c.id, extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf'))
from public.courses c
where not exists (
  select 1
  from public.course_access ca
  where ca.course_id = c.id
);

-- The old one-course/anonymous grant functions can remain in the
-- schema for compatibility, but this application does not use them.
-- Student access is now enforced by the signed course-specific cookie.

notify pgrst, 'reload schema';

-- ------------------------------------------------------------
-- Admin: update one course, including its password.
-- ------------------------------------------------------------
drop function if exists public.admin_update_course(uuid, text, text, text);

create or replace function public.admin_update_course(
  p_course_id uuid,
  p_title text,
  p_description text,
  p_password text default null
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  existing_access record;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if not exists (select 1 from public.courses where id = p_course_id) then
    raise exception 'Course not found.';
  end if;

  if length(trim(coalesce(p_title, ''))) < 1 then
    raise exception 'Course title is required.';
  end if;

  if p_password is not null and trim(p_password) <> '' then
    for existing_access in
      select password_hash
      from public.course_access
      where course_id <> p_course_id
    loop
      if existing_access.password_hash = extensions.crypt(trim(p_password), existing_access.password_hash) then
        raise exception 'That password is already assigned to another course.';
      end if;
    end loop;
  end if;

  update public.courses
  set title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''),
      updated_at = now()
  where id = p_course_id;

  if p_password is not null and trim(p_password) <> '' then
    insert into public.course_access (course_id, password_hash)
    values (
      p_course_id,
      extensions.crypt(trim(p_password), extensions.gen_salt('bf'))
    )
    on conflict (course_id)
    do update set
      password_hash = excluded.password_hash,
      updated_at = now();
  end if;

  return true;
end;
$$;

grant execute on function public.admin_update_course(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
