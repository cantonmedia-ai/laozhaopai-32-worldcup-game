alter table public.profiles
add column if not exists email_verified boolean default false,
add column if not exists welcome_email_sent boolean default false,
add column if not exists reminder_sent_3day boolean default false,
add column if not exists reminder_sent_24hour boolean default false,
add column if not exists reminder_sent_2hour boolean default false,
add column if not exists winner_email_sent boolean default false,
add column if not exists unsubscribed_from_email boolean default false;

update public.profiles
set email_verified = true
where email_verified is false
  and profile_completed is true;

create table if not exists public.email_settings (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null default 'Brainwave Games',
  sender_email text not null default 'hello@brainwaveai.my',
  reply_to_email text not null default 'hello@brainwaveai.my',
  test_recipient_email text,
  automation_enabled boolean not null default true,
  send_only_verified boolean not null default true,
  send_only_incomplete boolean not null default true,
  do_not_send_after_deadline boolean not null default true,
  do_not_duplicate_timing boolean not null default true,
  do_not_send_unsubscribed boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  type text unique not null,
  subject text not null,
  preview_text text,
  body text not null,
  cta_text text,
  cta_url text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  reminder_type text unique not null,
  hours_before_deadline int not null,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  recipient_email text not null,
  original_recipient_email text,
  email_type text not null,
  subject text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped', 'cancelled')),
  resend_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.email_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  game_id uuid,
  email_type text not null,
  recipient_email text not null,
  subject text,
  payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz not null default now(),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped', 'cancelled')),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists email_queue_status_scheduled_idx
on public.email_queue(status, scheduled_for);

create index if not exists email_logs_created_idx
on public.email_logs(created_at desc);

alter table public.email_settings enable row level security;
alter table public.email_templates enable row level security;
alter table public.email_reminder_rules enable row level security;
alter table public.email_logs enable row level security;
alter table public.email_queue enable row level security;

drop policy if exists "email settings admin only" on public.email_settings;
create policy "email settings admin only" on public.email_settings
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "email templates admin only" on public.email_templates;
create policy "email templates admin only" on public.email_templates
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "email reminder rules admin only" on public.email_reminder_rules;
create policy "email reminder rules admin only" on public.email_reminder_rules
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "email logs admin only" on public.email_logs;
create policy "email logs admin only" on public.email_logs
for all using (public.is_admin())
with check (public.is_admin());

drop policy if exists "email queue admin only" on public.email_queue;
create policy "email queue admin only" on public.email_queue
for all using (public.is_admin())
with check (public.is_admin());

insert into public.email_settings (sender_name, sender_email, reply_to_email)
select 'Brainwave Games', 'hello@brainwaveai.my', 'hello@brainwaveai.my'
where not exists (select 1 from public.email_settings);

insert into public.email_templates (type, subject, preview_text, body, cta_text, cta_url)
values
  ('verify_email', 'Verify Your Brainwave Games Account', 'Verify your email to start playing.', 'Welcome to Brainwave Games. Verify your email to submit predictions, join teams, earn points and claim rewards.', 'Verify Email', '/api/email/verify'),
  ('welcome', 'Welcome to Brainwave Games', 'Start making your predictions and climb the leaderboard.', 'Welcome to Brainwave Games. Start making your predictions and climb the leaderboard.', 'Start Playing', '/game'),
  ('incomplete_prediction_3day', 'Your Prediction Is Not Complete', 'Complete before the deadline.', 'You have not completed your current round prediction. Complete before the deadline.', 'Continue Prediction', '/road-to-champion'),
  ('incomplete_prediction_24hour', '24 Hours Left To Submit', 'Submit before the deadline.', 'Your prediction is still incomplete. Submit before the deadline.', 'Submit Prediction', '/road-to-champion'),
  ('incomplete_prediction_2hour', 'Final Reminder Before Deadline', 'Prediction closes soon.', 'Prediction closes soon. Submit now.', 'Submit Now', '/road-to-champion'),
  ('new_round_open', 'New Prediction Round Open', 'A new prediction round is now available.', 'A new prediction round is now available.', 'Predict Now', '/road-to-champion'),
  ('ranking_update', 'Your Ranking Has Been Updated', 'See your new ranking after the result.', 'Your ranking summary is ready. Check your points and leaderboard position.', 'View Ranking', '/leaderboard'),
  ('winner', 'Congratulations! You Won', 'You have won a prize in Brainwave Games.', 'Congratulations! You have won a prize in Brainwave Games.', 'View Results', '/results')
on conflict (type) do nothing;

insert into public.email_reminder_rules (reminder_type, hours_before_deadline, enabled)
values
  ('incomplete_prediction_3day', 72, true),
  ('incomplete_prediction_24hour', 24, true),
  ('incomplete_prediction_2hour', 2, true)
on conflict (reminder_type) do nothing;
