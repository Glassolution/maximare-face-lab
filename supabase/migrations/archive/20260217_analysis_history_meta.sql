-- Extensões da tabela analysis_history para metadados e idempotência
alter table public.analysis_history
  add column if not exists analysis_id uuid,
  add column if not exists image_meta jsonb,
  add column if not exists provider_meta jsonb,
  add column if not exists score integer,
  add column if not exists rank text;

do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'analysis_history'
      and constraint_type = 'UNIQUE'
      and constraint_name = 'analysis_history_user_analysis_id_key'
  ) then
    alter table public.analysis_history
      add constraint analysis_history_user_analysis_id_key unique (user_id, analysis_id);
  end if;
end$$;

