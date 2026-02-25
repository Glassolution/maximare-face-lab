-- profiles: status de assinatura/premium do usuário
create table if not exists public.profiles (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_premium boolean not null default false,
  plan text not null default 'free',
  premium_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Allow user read own profile'
  ) then
    create policy "Allow user read own profile"
      on public.profiles
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'Allow user update own profile'
  ) then
    create policy "Allow user update own profile"
      on public.profiles
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end$$;

create index if not exists profiles_user_idx on public.profiles (user_id);

-- analysis_history: histórico de análises e resultados
create table if not exists public.analysis_history (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  result_json jsonb not null,
  source text not null
);

alter table public.analysis_history enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'analysis_history' and policyname = 'Allow user read own analysis'
  ) then
    create policy "Allow user read own analysis"
      on public.analysis_history
      for select
      using (auth.uid() = user_id);
  end if;
end$$;

create index if not exists analysis_history_user_idx on public.analysis_history (user_id, created_at desc);

-- Ajustar usage_limits para incluir id e manter unicidade por user_id+date
alter table public.usage_limits
  add column if not exists id bigserial;

do $$
begin
  -- Garantir que a primary key seja baseada em id
  if exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'usage_limits'
      and constraint_type = 'PRIMARY KEY'
      and constraint_name = 'usage_limits_pkey'
  ) then
    begin
      alter table public.usage_limits drop constraint usage_limits_pkey;
    exception
      when undefined_object then null;
    end;
  end if;

  alter table public.usage_limits
    add constraint usage_limits_pkey primary key (id);

  -- Unicidade lógica por usuário+data
  if not exists (
    select 1
    from information_schema.table_constraints
    where table_name = 'usage_limits'
      and constraint_type = 'UNIQUE'
      and constraint_name = 'usage_limits_user_date_key'
  ) then
    alter table public.usage_limits
      add constraint usage_limits_user_date_key unique (user_id, date);
  end if;
end$$;

