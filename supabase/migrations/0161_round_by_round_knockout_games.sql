alter table public.point_transactions
drop constraint if exists point_transactions_source_type_check;

alter table public.point_transactions
add constraint point_transactions_source_type_check
check (
  source_type in (
    'early_signup',
    'referral',
    'road_to_champion',
    'knockout_winner_challenge',
    'team_knockout_winner_challenge'
  )
);

alter table public.point_transactions
add column if not exists match_id uuid,
add column if not exists round_key text;

create table if not exists public.knockout_rounds (
  id uuid primary key default gen_random_uuid(),
  round_key text unique not null check (round_key in ('last_32', 'last_16', 'last_8', 'last_4', 'final')),
  round_name text not null,
  status text not null default 'not_created' check (status in ('not_created', 'draft', 'open', 'locked', 'scored', 'completed')),
  created_by_admin_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  completed_at timestamptz
);

create table if not exists public.knockout_matches (
  id uuid primary key default gen_random_uuid(),
  round_key text not null references public.knockout_rounds(round_key) on delete cascade,
  match_number int not null,
  team_a_id uuid not null references public.teams(id),
  team_b_id uuid not null references public.teams(id),
  match_start_at timestamptz not null,
  prediction_lock_at timestamptz not null,
  actual_winner_team_id uuid references public.teams(id),
  status text not null default 'draft' check (status in ('draft', 'open', 'locked', 'scored', 'completed')),
  created_by_admin_id uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  scored_at timestamptz,
  unique(round_key, match_number),
  check (team_a_id <> team_b_id)
);

create table if not exists public.solo_match_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.knockout_matches(id) on delete cascade,
  selected_winner_team_id uuid not null references public.teams(id),
  status text not null default 'submitted' check (status in ('submitted', 'locked', 'scored')),
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  points_earned int default 0,
  is_correct boolean,
  unique(user_id, match_id)
);

create table if not exists public.game_teams (
  id uuid primary key default gen_random_uuid(),
  team_name text not null,
  team_code text unique not null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  max_members int not null default 5,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  status text not null default 'active' check (status in ('active', 'closed', 'archived'))
);

alter table public.point_transactions
add column if not exists team_id uuid references public.game_teams(id) on delete set null;

create table if not exists public.game_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.game_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('captain', 'member')),
  status text not null default 'active' check (status in ('active', 'left', 'removed')),
  joined_at timestamptz default now(),
  unique(team_id, user_id)
);

create table if not exists public.team_match_predictions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.game_teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  match_id uuid not null references public.knockout_matches(id) on delete cascade,
  selected_winner_team_id uuid not null references public.teams(id),
  status text not null default 'submitted' check (status in ('submitted', 'locked', 'scored')),
  submitted_at timestamptz default now(),
  updated_at timestamptz default now(),
  points_earned int default 0,
  is_correct boolean,
  unique(team_id, user_id, match_id)
);

create table if not exists public.team_score_summary (
  id uuid primary key default gen_random_uuid(),
  team_id uuid unique not null references public.game_teams(id) on delete cascade,
  total_points int not null default 0,
  active_member_count int not null default 0,
  average_score numeric not null default 0,
  ranking_position int,
  updated_at timestamptz default now()
);

create unique index if not exists point_transactions_knockout_solo_once_idx
on public.point_transactions(user_id, source_type, match_id)
where source_type = 'knockout_winner_challenge' and match_id is not null;

create unique index if not exists game_team_members_one_active_team_idx
on public.game_team_members(user_id)
where status = 'active';

create unique index if not exists point_transactions_knockout_team_once_idx
on public.point_transactions(user_id, source_type, match_id, team_id)
where source_type = 'team_knockout_winner_challenge' and match_id is not null;

alter table public.knockout_rounds enable row level security;
alter table public.knockout_matches enable row level security;
alter table public.solo_match_predictions enable row level security;
alter table public.game_teams enable row level security;
alter table public.game_team_members enable row level security;
alter table public.team_match_predictions enable row level security;
alter table public.team_score_summary enable row level security;

drop policy if exists "knockout rounds read" on public.knockout_rounds;
create policy "knockout rounds read" on public.knockout_rounds for select using (true);

drop policy if exists "knockout matches read" on public.knockout_matches;
create policy "knockout matches read" on public.knockout_matches for select using (true);

drop policy if exists "solo predictions own read" on public.solo_match_predictions;
create policy "solo predictions own read" on public.solo_match_predictions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "game teams visible" on public.game_teams;
create policy "game teams visible" on public.game_teams
for select using (status = 'active' or created_by_user_id = auth.uid() or public.is_admin());

drop policy if exists "game team members visible" on public.game_team_members;
create policy "game team members visible" on public.game_team_members
for select using (user_id = auth.uid() or public.is_admin() or exists (
  select 1 from public.game_team_members mine
  where mine.team_id = game_team_members.team_id
    and mine.user_id = auth.uid()
    and mine.status = 'active'
));

drop policy if exists "team predictions own read" on public.team_match_predictions;
create policy "team predictions own read" on public.team_match_predictions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "team summary read" on public.team_score_summary;
create policy "team summary read" on public.team_score_summary for select using (true);

insert into public.knockout_rounds (round_key, round_name, status)
values
  ('last_32', 'Last 32', 'not_created'),
  ('last_16', 'Last 16', 'not_created'),
  ('last_8', 'Last 8', 'not_created'),
  ('last_4', 'Last 4', 'not_created'),
  ('final', 'Final', 'not_created')
on conflict (round_key) do nothing;

create or replace function public.knockout_round_points(p_round_key text)
returns int
language sql
immutable
as $$
  select case p_round_key
    when 'last_32' then 5
    when 'last_16' then 8
    when 'last_8' then 12
    when 'last_4' then 18
    when 'final' then 30
    else 0
  end
$$;

create or replace function public.admin_upsert_knockout_match(
  p_match_id uuid,
  p_round_key text,
  p_match_number int,
  p_team_a_id uuid,
  p_team_b_id uuid,
  p_match_start_at timestamptz,
  p_prediction_lock_at timestamptz,
  p_status text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid := public.current_profile_id();
  v_match_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_status not in ('draft', 'open', 'locked', 'scored', 'completed') then
    raise exception 'Invalid match status.';
  end if;

  if p_team_a_id = p_team_b_id then
    raise exception 'Team A and Team B must be different.';
  end if;

  insert into public.knockout_rounds (round_key, round_name, status, created_by_admin_id)
  values (
    p_round_key,
    case p_round_key
      when 'last_32' then 'Last 32'
      when 'last_16' then 'Last 16'
      when 'last_8' then 'Last 8'
      when 'last_4' then 'Last 4'
      when 'final' then 'Final'
      else p_round_key
    end,
    'draft',
    v_admin_profile_id
  )
  on conflict (round_key) do update set
    status = case
      when knockout_rounds.status = 'not_created' then 'draft'
      else knockout_rounds.status
    end,
    updated_at = now();

  insert into public.knockout_matches (
    id,
    round_key,
    match_number,
    team_a_id,
    team_b_id,
    match_start_at,
    prediction_lock_at,
    status,
    created_by_admin_id,
    updated_at
  )
  values (
    coalesce(p_match_id, gen_random_uuid()),
    p_round_key,
    p_match_number,
    p_team_a_id,
    p_team_b_id,
    p_match_start_at,
    p_prediction_lock_at,
    p_status,
    v_admin_profile_id,
    now()
  )
  on conflict (round_key, match_number) do update set
    team_a_id = excluded.team_a_id,
    team_b_id = excluded.team_b_id,
    match_start_at = excluded.match_start_at,
    prediction_lock_at = excluded.prediction_lock_at,
    status = excluded.status,
    updated_at = now()
  returning id into v_match_id;

  update public.knockout_rounds
  set status = case when p_status = 'open' then 'open' else status end,
      updated_at = now()
  where round_key = p_round_key;

  return v_match_id;
end;
$$;

create or replace function public.save_solo_knockout_prediction(
  p_match_id uuid,
  p_selected_winner_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.knockout_matches;
begin
  if auth.uid() is null then
    raise exception 'Please login before submitting.';
  end if;

  select * into v_match
  from public.knockout_matches
  where id = p_match_id;

  if v_match.id is null then
    raise exception 'Match not found.';
  end if;

  if v_match.status not in ('open', 'draft') or now() >= v_match.prediction_lock_at then
    raise exception 'Prediction is locked. Waiting for match result.';
  end if;

  if p_selected_winner_team_id not in (v_match.team_a_id, v_match.team_b_id) then
    raise exception 'Selected winner must be one of the match teams.';
  end if;

  insert into public.solo_match_predictions (
    user_id,
    match_id,
    selected_winner_team_id,
    status,
    submitted_at,
    updated_at
  )
  values (
    auth.uid(),
    p_match_id,
    p_selected_winner_team_id,
    'submitted',
    now(),
    now()
  )
  on conflict (user_id, match_id) do update set
    selected_winner_team_id = excluded.selected_winner_team_id,
    status = 'submitted',
    submitted_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.create_game_team(p_team_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Please login first.';
  end if;

  if exists (
    select 1 from public.game_team_members
    where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Each user can only join one team.';
  end if;

  v_code := 'TEAM' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));

  insert into public.game_teams (team_name, team_code, created_by_user_id)
  values (nullif(trim(p_team_name), ''), v_code, auth.uid())
  returning id into v_team_id;

  insert into public.game_team_members (team_id, user_id, role)
  values (v_team_id, auth.uid(), 'captain');

  return v_team_id;
end;
$$;

create or replace function public.join_game_team(p_team_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team public.game_teams;
  v_member_count int;
begin
  if auth.uid() is null then
    raise exception 'Please login first.';
  end if;

  if exists (
    select 1 from public.game_team_members
    where user_id = auth.uid() and status = 'active'
  ) then
    raise exception 'Each user can only join one team.';
  end if;

  select * into v_team
  from public.game_teams
  where team_code = upper(trim(p_team_code))
    and status = 'active';

  if v_team.id is null then
    raise exception 'Team code not found.';
  end if;

  select count(*)::int into v_member_count
  from public.game_team_members
  where team_id = v_team.id and status = 'active';

  if v_member_count >= v_team.max_members then
    raise exception 'Team is full.';
  end if;

  insert into public.game_team_members (team_id, user_id, role)
  values (v_team.id, auth.uid(), 'member');

  return v_team.id;
end;
$$;

create or replace function public.save_team_knockout_prediction(
  p_match_id uuid,
  p_selected_winner_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.knockout_matches;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Please login before submitting.';
  end if;

  select team_id into v_team_id
  from public.game_team_members
  where user_id = auth.uid() and status = 'active'
  limit 1;

  if v_team_id is null then
    raise exception 'Create or join a team first.';
  end if;

  select * into v_match from public.knockout_matches where id = p_match_id;

  if v_match.id is null then
    raise exception 'Match not found.';
  end if;

  if v_match.status not in ('open', 'draft') or now() >= v_match.prediction_lock_at then
    raise exception 'Prediction is locked. Waiting for match result.';
  end if;

  if p_selected_winner_team_id not in (v_match.team_a_id, v_match.team_b_id) then
    raise exception 'Selected winner must be one of the match teams.';
  end if;

  insert into public.team_match_predictions (
    team_id,
    user_id,
    match_id,
    selected_winner_team_id,
    status,
    submitted_at,
    updated_at
  )
  values (
    v_team_id,
    auth.uid(),
    p_match_id,
    p_selected_winner_team_id,
    'submitted',
    now(),
    now()
  )
  on conflict (team_id, user_id, match_id) do update set
    selected_winner_team_id = excluded.selected_winner_team_id,
    status = 'submitted',
    submitted_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.rebuild_team_score_summary()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.team_score_summary (
    team_id,
    total_points,
    active_member_count,
    average_score,
    ranking_position,
    updated_at
  )
  with team_totals as (
    select
      gt.id as team_id,
      coalesce(sum(tmp.points_earned), 0)::int as total_points,
      count(distinct tmp.user_id) filter (where tmp.id is not null)::int as active_member_count
    from public.game_teams gt
    left join public.team_match_predictions tmp
      on tmp.team_id = gt.id
      and tmp.status = 'scored'
    where gt.status = 'active'
    group by gt.id
  ),
  ranked as (
    select
      team_id,
      total_points,
      active_member_count,
      case
        when active_member_count = 0 then 0
        else round(total_points::numeric / active_member_count::numeric, 2)
      end as average_score,
      row_number() over (
        order by
          case
            when active_member_count = 0 then 0
            else total_points::numeric / active_member_count::numeric
          end desc,
          total_points desc
      )::int as ranking_position
    from team_totals
  )
  select team_id, total_points, active_member_count, average_score, ranking_position, now()
  from ranked
  on conflict (team_id) do update set
    total_points = excluded.total_points,
    active_member_count = excluded.active_member_count,
    average_score = excluded.average_score,
    ranking_position = excluded.ranking_position,
    updated_at = now();
end;
$$;

create or replace function public.admin_confirm_knockout_match_result(
  p_match_id uuid,
  p_actual_winner_team_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.knockout_matches;
  v_points int;
  v_admin_profile_id uuid := public.current_profile_id();
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select * into v_match
  from public.knockout_matches
  where id = p_match_id
  for update;

  if v_match.id is null then
    raise exception 'Match not found.';
  end if;

  if v_match.status in ('scored', 'completed') then
    raise exception 'This match has already been scored.';
  end if;

  if p_actual_winner_team_id not in (v_match.team_a_id, v_match.team_b_id) then
    raise exception 'Winner must be one of the match teams.';
  end if;

  v_points := public.knockout_round_points(v_match.round_key);

  update public.knockout_matches
  set actual_winner_team_id = p_actual_winner_team_id,
      status = 'completed',
      scored_at = now(),
      updated_at = now()
  where id = p_match_id;

  update public.solo_match_predictions
  set status = 'scored',
      is_correct = selected_winner_team_id = p_actual_winner_team_id,
      points_earned = case when selected_winner_team_id = p_actual_winner_team_id then v_points else 0 end,
      updated_at = now()
  where match_id = p_match_id
    and status <> 'scored';

  insert into public.point_transactions (
    user_id,
    source_type,
    match_id,
    round_key,
    points,
    description
  )
  select
    user_id,
    'knockout_winner_challenge',
    match_id,
    v_match.round_key,
    points_earned,
    'Knockout Winner Challenge'
  from public.solo_match_predictions
  where match_id = p_match_id
    and points_earned > 0
  on conflict do nothing;

  update public.team_match_predictions
  set status = 'scored',
      is_correct = selected_winner_team_id = p_actual_winner_team_id,
      points_earned = case when selected_winner_team_id = p_actual_winner_team_id then v_points else 0 end,
      updated_at = now()
  where match_id = p_match_id
    and status <> 'scored';

  insert into public.point_transactions (
    user_id,
    team_id,
    source_type,
    match_id,
    round_key,
    points,
    description
  )
  select
    user_id,
    team_id,
    'team_knockout_winner_challenge',
    match_id,
    v_match.round_key,
    points_earned,
    'Team Knockout Winner Challenge'
  from public.team_match_predictions
  where match_id = p_match_id
    and points_earned > 0
  on conflict do nothing;

  perform public.rebuild_team_score_summary();

  if not exists (
    select 1 from public.knockout_matches
    where round_key = v_match.round_key
      and status not in ('completed', 'scored')
  ) then
    update public.knockout_rounds
    set status = 'completed',
        completed_at = now(),
        updated_at = now()
    where round_key = v_match.round_key;
  end if;

  insert into public.admin_audit_logs (
    admin_profile_id,
    action_type,
    target_table,
    target_id,
    new_value,
    reason
  )
  values (
    v_admin_profile_id,
    'confirm_knockout_match_result',
    'knockout_matches',
    p_match_id,
    jsonb_build_object(
      'round_key', v_match.round_key,
      'winner_team_id', p_actual_winner_team_id,
      'points', v_points
    ),
    'Knockout match result confirmed'
  );
end;
$$;

create or replace function public.admin_create_next_knockout_round(p_previous_round_key text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_next_round_key text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  v_next_round_key := case p_previous_round_key
    when 'last_32' then 'last_16'
    when 'last_16' then 'last_8'
    when 'last_8' then 'last_4'
    when 'last_4' then 'final'
    else null
  end;

  if v_next_round_key is null then
    raise exception 'No next round available.';
  end if;

  if exists (
    select 1 from public.knockout_matches
    where round_key = p_previous_round_key
      and status <> 'completed'
  ) then
    raise exception 'Previous round must be completed first.';
  end if;

  update public.knockout_rounds
  set status = case when status = 'not_created' then 'draft' else status end,
      created_by_admin_id = coalesce(created_by_admin_id, public.current_profile_id()),
      updated_at = now()
  where round_key = v_next_round_key;

  return v_next_round_key;
end;
$$;

grant execute on function public.admin_upsert_knockout_match(uuid, text, int, uuid, uuid, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.save_solo_knockout_prediction(uuid, uuid) to authenticated;
grant execute on function public.create_game_team(text) to authenticated;
grant execute on function public.join_game_team(text) to authenticated;
grant execute on function public.save_team_knockout_prediction(uuid, uuid) to authenticated;
grant execute on function public.admin_confirm_knockout_match_result(uuid, uuid) to authenticated;
grant execute on function public.admin_create_next_knockout_round(text) to authenticated;
grant execute on function public.rebuild_team_score_summary() to authenticated;
