-- usage_limits: controles diários de uso por usuário
create table if not exists public.usage_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  scans_used integer not null default 0,
  scans_limit integer not null default 3,
  reset_at timestamptz not null,
  last_scan_at timestamptz null,
  primary key (user_id, date)
);

alter table public.usage_limits enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usage_limits' and policyname = 'Allow user read own'
  ) then
    create policy "Allow user read own"
      on public.usage_limits
      for select
      using (auth.uid() = user_id);
  end if;
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'usage_limits' and policyname = 'Allow user update own'
  ) then
    create policy "Allow user update own"
      on public.usage_limits
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

create index if not exists usage_limits_user_date_idx on public.usage_limits (user_id, date);
