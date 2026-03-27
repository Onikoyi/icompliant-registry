begin;

create table if not exists public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- students_csv | staff_csv | api_ingest
  status text not null default 'queued', -- queued | processing | completed | failed
  created_by uuid null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_import_jobs_type on public.import_jobs(type);
create index if not exists idx_import_jobs_status on public.import_jobs(status);
create index if not exists idx_import_jobs_created_at on public.import_jobs(created_at);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'import_jobs_created_by_fkey') then
    alter table public.import_jobs
      add constraint import_jobs_created_by_fkey
      foreign key (created_by)
      references public.users(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.import_items (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null,
  row_number int not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending', -- pending | success | error
  error_message text null,
  result_entity_type text null, -- student | staff | owner | document
  result_entity_id uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_import_items_job_id on public.import_items(job_id);
create index if not exists idx_import_items_status on public.import_items(status);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'import_items_job_id_fkey') then
    alter table public.import_items
      add constraint import_items_job_id_fkey
      foreign key (job_id)
      references public.import_jobs(id)
      on delete cascade;
  end if;
end $$;

commit;