create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique not null references auth.users(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  role text not null default 'player' check (role in ('player','admin')),
  display_name text unique,
  nickname text,
  phone text,
  phone_number text,
  whatsapp_number text,
  email text,
  avatar_url text,
  login_provider text,
  provider text,
  auth_provider text,
  referral_code text unique not null,
  referred_by_profile_id uuid references public.profiles(id),
  favorite_team text,
  preferred_outlet text,
  accept_marketing boolean default false,
  profile_completed boolean default false,
  display_name_updated_at timestamptz,
  is_blocked boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  status text default 'draft' check (status in ('draft','active','completed','archived')),
  description text,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  name text not null,
  short_name text,
  flag_url text,
  group_name text,
  seed_no int,
  created_at timestamptz default now()
);

create table public.game_rounds (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  round_name text not null,
  round_label_cn text,
  round_order int not null,
  scoring_points int not null,
  status text default 'not_open' check (status in ('not_open','prediction_open','prediction_closed','results_revealed','completed')),
  prediction_open_at timestamptz,
  prediction_close_at timestamptz,
  result_revealed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  round_id uuid references public.game_rounds(id) on delete cascade,
  match_no int,
  team_a_id uuid references public.teams(id),
  team_b_id uuid references public.teams(id),
  team_a_score int,
  team_b_score int,
  winner_team_id uuid references public.teams(id),
  match_time timestamptz,
  prediction_deadline timestamptz,
  status text default 'scheduled' check (status in ('scheduled','prediction_open','prediction_closed','completed','cancelled')),
  result_confirmed_by uuid references public.profiles(id),
  result_confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.predictions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  round_id uuid references public.game_rounds(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  predicted_winner_team_id uuid references public.teams(id),
  predicted_team_a_score int,
  predicted_team_b_score int,
  is_locked boolean default false,
  submitted_at timestamptz default now(),
  score_awarded int default 0,
  is_correct boolean,
  calculated_at timestamptz,
  unique(profile_id, match_id)
);

create table public.score_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  round_id uuid references public.game_rounds(id) on delete cascade,
  match_id uuid references public.matches(id) on delete cascade,
  points_awarded int default 0,
  reason text,
  created_at timestamptz default now()
);

create table public.leaderboard_scores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  round_id uuid references public.game_rounds(id) on delete cascade,
  round_score int default 0,
  total_score int default 0,
  correct_predictions int default 0,
  total_predictions int default 0,
  accuracy_rate numeric default 0,
  rank_position int,
  previous_rank_position int,
  updated_at timestamptz default now(),
  unique(profile_id, game_id, round_id)
);

create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_profile_id uuid references public.profiles(id) on delete cascade,
  referred_profile_id uuid references public.profiles(id) on delete cascade,
  referral_code text,
  created_at timestamptz default now(),
  reward_status text default 'pending',
  unique(referrer_profile_id, referred_profile_id),
  check (referrer_profile_id <> referred_profile_id)
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references public.games(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  reward_type text,
  reward_name text,
  rank_type text,
  rank_position int,
  claim_code text unique,
  claim_status text default 'unclaimed' check (claim_status in ('unclaimed','claimed','expired','cancelled')),
  expiry_date timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_profile_id uuid references public.profiles(id),
  action_type text not null,
  target_table text,
  target_id uuid,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz default now()
);

create or replace function public.current_profile_id()
returns uuid
language sql
stable
as $$
  select id from public.profiles where auth_user_id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid() and role = 'admin' and is_blocked = false
  )
$$;

create or replace function public.generate_referral_code()
returns text
language sql
as $$
  select 'LZP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    auth_user_id,
    user_id,
    email,
    avatar_url,
    login_provider,
    provider,
    auth_provider,
    referral_code
  )
  values (
    new.id,
    new.id,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    new.app_metadata->>'provider',
    new.app_metadata->>'provider',
    new.app_metadata->>'provider',
    public.generate_referral_code()
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.submit_prediction(
  p_match_id uuid,
  p_predicted_winner_team_id uuid,
  p_predicted_team_a_score int default null,
  p_predicted_team_b_score int default null
)
returns public.predictions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_match public.matches;
  v_prediction public.predictions;
begin
  if v_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select * into v_match from public.matches where id = p_match_id;

  if not found or v_match.status = 'completed' or now() >= v_match.prediction_deadline then
    raise exception 'Prediction is closed';
  end if;

  if exists (select 1 from public.profiles where id = v_profile_id and is_blocked = true) then
    raise exception 'Blocked users cannot submit predictions';
  end if;

  insert into public.predictions (
    profile_id,
    game_id,
    round_id,
    match_id,
    predicted_winner_team_id,
    predicted_team_a_score,
    predicted_team_b_score,
    submitted_at
  )
  values (
    v_profile_id,
    v_match.game_id,
    v_match.round_id,
    p_match_id,
    p_predicted_winner_team_id,
    p_predicted_team_a_score,
    p_predicted_team_b_score,
    now()
  )
  on conflict (profile_id, match_id) do update set
    predicted_winner_team_id = excluded.predicted_winner_team_id,
    predicted_team_a_score = excluded.predicted_team_a_score,
    predicted_team_b_score = excluded.predicted_team_b_score,
    submitted_at = now()
  returning * into v_prediction;

  return v_prediction;
end;
$$;

create or replace function public.confirm_match_result(
  p_match_id uuid,
  p_team_a_score int,
  p_team_b_score int,
  p_winner_team_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid := public.current_profile_id();
  v_match public.matches;
  v_round public.game_rounds;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select * into v_match from public.matches where id = p_match_id for update;
  select * into v_round from public.game_rounds where id = v_match.round_id;

  update public.matches
  set team_a_score = p_team_a_score,
      team_b_score = p_team_b_score,
      winner_team_id = p_winner_team_id,
      status = 'completed',
      result_confirmed_by = v_admin_profile_id,
      result_confirmed_at = now(),
      updated_at = now()
  where id = p_match_id;

  update public.predictions
  set is_locked = true,
      is_correct = predicted_winner_team_id = p_winner_team_id,
      score_awarded =
        case when predicted_winner_team_id = p_winner_team_id then v_round.scoring_points else 0 end
        + case
            when predicted_team_a_score = p_team_a_score
             and predicted_team_b_score = p_team_b_score then 15
            when predicted_team_a_score = p_team_a_score
              or predicted_team_b_score = p_team_b_score then 5
            else 0
          end,
      calculated_at = now()
  where match_id = p_match_id;

  insert into public.score_history (profile_id, game_id, round_id, match_id, points_awarded, reason)
  select profile_id, game_id, round_id, match_id, score_awarded, 'match_result_confirmed'
  from public.predictions
  where match_id = p_match_id;

  insert into public.admin_audit_logs (admin_profile_id, action_type, target_table, target_id, new_value, reason)
  values (
    v_admin_profile_id,
    'confirm_match_result',
    'matches',
    p_match_id,
    jsonb_build_object('team_a_score', p_team_a_score, 'team_b_score', p_team_b_score, 'winner_team_id', p_winner_team_id),
    p_reason
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.games enable row level security;
alter table public.teams enable row level security;
alter table public.game_rounds enable row level security;
alter table public.matches enable row level security;
alter table public.predictions enable row level security;
alter table public.score_history enable row level security;
alter table public.leaderboard_scores enable row level security;
alter table public.referrals enable row level security;
alter table public.rewards enable row level security;
alter table public.admin_audit_logs enable row level security;

create policy "profiles read own or admin" on public.profiles
for select using (auth_user_id = auth.uid() or public.is_admin());

create policy "profiles insert own" on public.profiles
for insert with check (
  auth_user_id = auth.uid()
  and coalesce(user_id, auth_user_id) = auth.uid()
  and role = 'player'
  and is_blocked = false
);

create policy "profiles update own limited" on public.profiles
for update using (auth_user_id = auth.uid() or public.is_admin())
with check (
  public.is_admin()
  or (
    auth_user_id = auth.uid()
    and role = (select role from public.profiles p where p.auth_user_id = auth.uid())
    and is_blocked = (select is_blocked from public.profiles p where p.auth_user_id = auth.uid())
  )
);

create policy "public game read" on public.games for select using (true);
create policy "public teams read" on public.teams for select using (true);
create policy "public rounds read" on public.game_rounds for select using (true);
create policy "public matches read" on public.matches for select using (true);

create policy "admin games write" on public.games for all using (public.is_admin()) with check (public.is_admin());
create policy "admin teams write" on public.teams for all using (public.is_admin()) with check (public.is_admin());
create policy "admin rounds write" on public.game_rounds for all using (public.is_admin()) with check (public.is_admin());
create policy "admin matches write" on public.matches for all using (public.is_admin()) with check (public.is_admin());

create policy "predictions own read" on public.predictions
for select using (profile_id = public.current_profile_id() or public.is_admin());

create policy "predictions own insert" on public.predictions
for insert with check (profile_id = public.current_profile_id());

create policy "predictions own update before lock" on public.predictions
for update using (
  profile_id = public.current_profile_id()
  and is_locked = false
  and exists (
    select 1 from public.matches m
    where m.id = match_id and m.status <> 'completed' and now() < m.prediction_deadline
  )
);

create policy "leaderboard read" on public.leaderboard_scores for select using (true);
create policy "score history own or admin" on public.score_history
for select using (profile_id = public.current_profile_id() or public.is_admin());

create policy "referrals related or admin" on public.referrals
for select using (
  referrer_profile_id = public.current_profile_id()
  or referred_profile_id = public.current_profile_id()
  or public.is_admin()
);

create policy "rewards own or admin" on public.rewards
for select using (profile_id = public.current_profile_id() or public.is_admin());

create policy "admin rewards write" on public.rewards for all using (public.is_admin()) with check (public.is_admin());
create policy "admin audit read" on public.admin_audit_logs for select using (public.is_admin());
create policy "admin audit insert" on public.admin_audit_logs for insert with check (public.is_admin());
