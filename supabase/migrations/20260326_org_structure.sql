begin;

-- 1) campuses table (create if missing)
create table if not exists public.campuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now()
);

-- unique campus codes + (optional) unique names
create unique index if not exists uq_campuses_code_lower
  on public.campuses (lower(code));

create unique index if not exists uq_campuses_name_lower
  on public.campuses (lower(name));

-- 2) faculties constraints/indexes (table exists already; we add safety)
alter table public.faculties
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'faculties_campus_id_fkey'
  ) then
    alter table public.faculties
      add constraint faculties_campus_id_fkey
      foreign key (campus_id)
      references public.campuses(id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_faculties_campus_id
  on public.faculties(campus_id);

create unique index if not exists uq_faculties_campus_code_lower
  on public.faculties (campus_id, lower(code));

create unique index if not exists uq_faculties_campus_name_lower
  on public.faculties (campus_id, lower(name));

-- 3) departments constraints/indexes (table exists already)
alter table public.departments
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'departments_faculty_id_fkey'
  ) then
    alter table public.departments
      add constraint departments_faculty_id_fkey
      foreign key (faculty_id)
      references public.faculties(id)
      on delete restrict;
  end if;
end $$;

create index if not exists idx_departments_faculty_id
  on public.departments(faculty_id);

create unique index if not exists uq_departments_faculty_code_lower
  on public.departments (faculty_id, lower(code));

create unique index if not exists uq_departments_faculty_name_lower
  on public.departments (faculty_id, lower(name));

commit;