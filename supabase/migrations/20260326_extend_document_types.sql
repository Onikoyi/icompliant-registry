begin;

-- 1) Extend existing document_types table safely
alter table public.document_types
  add column if not exists purpose text,
  add column if not exists department_id uuid null,
  add column if not exists requires_approval boolean not null default false,
  add column if not exists expiry_required boolean not null default false,
  add column if not exists expiry_days integer null,
  add column if not exists is_active boolean not null default true,
  add column if not exists updated_at timestamp with time zone not null default now(),
  add column if not exists created_by uuid null,
  add column if not exists updated_by uuid null;

-- 2) Ensure owner_type can support the new "both" option
alter table public.document_types
  alter column owner_type type text;

-- 3) Backfill null owner_type values safely if any exist
update public.document_types
set owner_type = 'both'
where owner_type is null;

-- 4) Add check constraint for owner_type / applies_to semantics
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_types_owner_type_check'
  ) then
    alter table public.document_types
      add constraint document_types_owner_type_check
      check (owner_type in ('student', 'staff', 'both'));
  end if;
end $$;

-- 5) Add business rule for expiry_days
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_types_expiry_days_check'
  ) then
    alter table public.document_types
      add constraint document_types_expiry_days_check
      check (
        (expiry_required = false and expiry_days is null)
        or
        (expiry_required = true and expiry_days is not null and expiry_days > 0)
      );
  end if;
end $$;

-- 6) Foreign key to departments
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_types_department_id_fkey'
  ) then
    alter table public.document_types
      add constraint document_types_department_id_fkey
      foreign key (department_id)
      references public.departments(id)
      on delete set null;
  end if;
end $$;

-- 7) Optional foreign keys to users for audit trail
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_types_created_by_fkey'
  ) then
    alter table public.document_types
      add constraint document_types_created_by_fkey
      foreign key (created_by)
      references public.users(id)
      on delete set null;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_types_updated_by_fkey'
  ) then
    alter table public.document_types
      add constraint document_types_updated_by_fkey
      foreign key (updated_by)
      references public.users(id)
      on delete set null;
  end if;
end $$;

-- 8) Indexes for admin filtering and upload-time lookup
create index if not exists idx_document_types_owner_type
  on public.document_types(owner_type);

create index if not exists idx_document_types_department_id
  on public.document_types(department_id);

create index if not exists idx_document_types_is_active
  on public.document_types(is_active);

-- 9) Case-insensitive uniqueness for active names
create unique index if not exists uq_document_types_name_lower
  on public.document_types (lower(name));

commit;