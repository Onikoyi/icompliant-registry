begin;

-- 1) Create the files table (folder/case-file/cover)
create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null,
  title text not null,
  description text null,

  -- optional ownership context (flexible)
  owner_kind text not null default 'general', -- general | department | student | staff
  owner_id uuid null,

  department_id uuid null,

  is_active boolean not null default true,

  created_by uuid null,
  updated_by uuid null,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Unique reference code (case-insensitive)
create unique index if not exists uq_files_reference_code_lower
on public.files (lower(reference_code));

-- Helpful indexes
create index if not exists idx_files_owner_kind on public.files(owner_kind);
create index if not exists idx_files_owner_id on public.files(owner_id);
create index if not exists idx_files_department_id on public.files(department_id);
create index if not exists idx_files_is_active on public.files(is_active);

-- Owner-kind constraint
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'files_owner_kind_check'
  ) then
    alter table public.files
      add constraint files_owner_kind_check
      check (owner_kind in ('general','department','student','staff'));
  end if;
end $$;

-- FK to departments (optional)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'files_department_id_fkey'
  ) then
    alter table public.files
      add constraint files_department_id_fkey
      foreign key (department_id)
      references public.departments(id)
      on delete set null;
  end if;
end $$;

-- FK to users (optional traceability)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'files_created_by_fkey'
  ) then
    alter table public.files
      add constraint files_created_by_fkey
      foreign key (created_by)
      references public.users(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'files_updated_by_fkey'
  ) then
    alter table public.files
      add constraint files_updated_by_fkey
      foreign key (updated_by)
      references public.users(id)
      on delete set null;
  end if;
end $$;

-- 2) Add file_id to documents (nullable, safe)
alter table public.documents
  add column if not exists file_id uuid null;

-- FK: documents.file_id -> files.id
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_file_id_fkey'
  ) then
    alter table public.documents
      add constraint documents_file_id_fkey
      foreign key (file_id)
      references public.files(id)
      on delete set null;
  end if;
end $$;

create index if not exists idx_documents_file_id
on public.documents(file_id);

commit;