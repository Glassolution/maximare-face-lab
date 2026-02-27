create table if not exists public.subscription_cancellation_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'mercadopago',
  provider_subscription_id text null,
  provider_payment_id text null,
  plan_type text null,
  price numeric null,
  is_within_7_days boolean not null,
  reason_primary text not null,
  reason_details text null,
  nps integer null,
  had_issues boolean null,
  issue_details text null,
  retention_offer_shown text null,
  retention_offer_accepted boolean null,
  final_action text not null,
  refund_status text not null default 'not_applicable',
  provider_payload jsonb null,
  created_at timestamptz not null default now()
);

alter table public.subscription_cancellation_feedback enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'subscription_cancellation_feedback' and policyname = 'Users can insert own feedback'
  ) then
    create policy "Users can insert own feedback"
      on public.subscription_cancellation_feedback
      for insert
      to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies 
    where schemaname = 'public' and tablename = 'subscription_cancellation_feedback' and policyname = 'Users can select own feedback'
  ) then
    create policy "Users can select own feedback"
      on public.subscription_cancellation_feedback
      for select
      to authenticated
      using (auth.uid() = user_id);
  end if;
end $$;

create index if not exists subscription_cancellation_feedback_user_idx on public.subscription_cancellation_feedback(user_id);
create index if not exists subscription_cancellation_feedback_created_idx on public.subscription_cancellation_feedback(created_at);

alter table public.profiles
  add column if not exists subscription_started_at timestamptz null,
  add column if not exists first_payment_at timestamptz null,
  add column if not exists provider_subscription_id text null,
  add column if not exists provider_payment_id text null,
  add column if not exists cancelled_at timestamptz null,
  add column if not exists cancel_reason text null;

