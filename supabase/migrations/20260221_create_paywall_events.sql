-- Create paywall_events table for analytics
create table if not exists public.paywall_events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  event_type text not null, -- 'shown', 'dismissed', 'cta_clicked', 'checkout_started', 'premium_activated', 'checkout_failed'
  context jsonb default '{}'::jsonb, -- Store trigger, screen, plan details
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.paywall_events enable row level security;

create policy "Users can insert their own events"
  on public.paywall_events for insert
  with check (auth.uid() = user_id);

create policy "Users can view their own events"
  on public.paywall_events for select
  using (auth.uid() = user_id);

-- Add indexes for analytics queries
create index if not exists idx_paywall_events_user_id on public.paywall_events(user_id);
create index if not exists idx_paywall_events_event_type on public.paywall_events(event_type);
create index if not exists idx_paywall_events_created_at on public.paywall_events(created_at);
