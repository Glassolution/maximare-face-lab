-- ia_logs: logs de chamadas ao provedor de IA e limites
create table if not exists public.ia_logs (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  user_id uuid null references auth.users(id) on delete set null,
  ip text null,
  event_type text not null,
  provider text null,
  status_code integer null,
  error_message text null,
  retry_after integer null,
  x_ratelimit_remaining text null,
  request_id text null,
  limit integer null,
  used integer null,
  reset_at timestamptz null
);

alter table public.ia_logs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'ia_logs' and policyname = 'Allow user read own logs'
  ) then
    create policy "Allow user read own logs"
      on public.ia_logs
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

create index if not exists ia_logs_user_idx on public.ia_logs (user_id);
create index if not exists ia_logs_created_idx on public.ia_logs (created_at desc);
