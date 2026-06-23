create table if not exists public.user_action_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  nickname text,
  action_type text not null,
  action_status text not null default 'info'
    check (action_status in ('success', 'failed', 'warning', 'info')),
  page_path text,
  game_key text,
  match_id text,
  team_id uuid,
  referral_code text,
  message text,
  metadata jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.system_error_logs (
  id uuid primary key default gen_random_uuid(),
  error_reference_id text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  user_email text,
  error_type text not null default 'unknown_error',
  error_message text not null,
  error_stack text,
  page_path text,
  function_name text,
  game_key text,
  match_id text,
  team_id uuid,
  request_payload_summary jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists user_action_logs_created_idx
on public.user_action_logs(created_at desc);

create index if not exists user_action_logs_action_idx
on public.user_action_logs(action_type, action_status, created_at desc);

create index if not exists user_action_logs_game_idx
on public.user_action_logs(game_key, created_at desc);

create index if not exists user_action_logs_referral_idx
on public.user_action_logs(referral_code, created_at desc);

create index if not exists system_error_logs_created_idx
on public.system_error_logs(created_at desc);

create index if not exists system_error_logs_type_idx
on public.system_error_logs(error_type, created_at desc);

create index if not exists system_error_logs_reference_idx
on public.system_error_logs(error_reference_id);

alter table public.user_action_logs enable row level security;
alter table public.system_error_logs enable row level security;

drop policy if exists "user action logs admin read" on public.user_action_logs;
create policy "user action logs admin read" on public.user_action_logs
for select using (public.is_admin());

drop policy if exists "system error logs admin read" on public.system_error_logs;
create policy "system error logs admin read" on public.system_error_logs
for select using (public.is_admin());

drop policy if exists "user action logs admin insert" on public.user_action_logs;
create policy "user action logs admin insert" on public.user_action_logs
for insert with check (public.is_admin());

drop policy if exists "system error logs admin insert" on public.system_error_logs;
create policy "system error logs admin insert" on public.system_error_logs
for insert with check (public.is_admin());
