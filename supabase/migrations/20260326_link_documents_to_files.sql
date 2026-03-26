begin;

alter table public.documents
  add column if not exists file_id uuid null;

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