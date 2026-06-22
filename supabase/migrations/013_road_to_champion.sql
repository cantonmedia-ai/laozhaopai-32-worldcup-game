create table if not exists public.prediction_stages (
  id uuid primary key default gen_random_uuid(),
  stage_key text unique not null check (stage_key in ('last_16', 'last_8', 'last_4', 'finalists', 'champion')),
  stage_name text not null,
  required_selection_count int not null,
  points_per_correct int not null,
  perfect_bonus_points int not null default 0,
  due_at timestamptz not null,
  status text not null default 'draft' check (status in ('draft', 'open', 'locked', 'scored')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.user_stage_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stage_key text not null references public.prediction_stages(stage_key) on delete cascade,
  selected_team_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'submitted', 'locked', 'scored')),
  submitted_at timestamptz,
  updated_at timestamptz default now(),
  points_earned int default 0,
  correct_count int default 0,
  bonus_earned int default 0,
  unique(user_id, stage_key)
);

create table if not exists public.stage_results (
  id uuid primary key default gen_random_uuid(),
  stage_key text unique not null references public.prediction_stages(stage_key) on delete cascade,
  official_team_ids uuid[] not null default '{}',
  confirmed_by_admin_id uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.point_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('early_signup', 'referral', 'road_to_champion')),
  stage_key text references public.prediction_stages(stage_key),
  points int not null default 0,
  description text,
  created_at timestamptz default now()
);

create unique index if not exists point_transactions_user_source_stage_idx
on public.point_transactions(user_id, source_type, stage_key);

alter table public.prediction_stages enable row level security;
alter table public.user_stage_predictions enable row level security;
alter table public.stage_results enable row level security;
alter table public.point_transactions enable row level security;

drop policy if exists "prediction stages read" on public.prediction_stages;
create policy "prediction stages read" on public.prediction_stages
for select using (true);

drop policy if exists "user stage predictions own read" on public.user_stage_predictions;
create policy "user stage predictions own read" on public.user_stage_predictions
for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "stage results read" on public.stage_results;
create policy "stage results read" on public.stage_results
for select using (true);

drop policy if exists "point transactions own read" on public.point_transactions;
create policy "point transactions own read" on public.point_transactions
for select using (user_id = auth.uid() or public.is_admin());

insert into public.prediction_stages (
  stage_key,
  stage_name,
  required_selection_count,
  points_per_correct,
  perfect_bonus_points,
  due_at,
  status
)
values
  ('last_16', 'Last 16', 16, 2, 20, timezone('Asia/Kuala_Lumpur', '2026-06-28 23:59:00'::timestamp), 'open'),
  ('last_8', 'Last 8', 8, 4, 20, timezone('Asia/Kuala_Lumpur', '2026-07-02 23:59:00'::timestamp), 'draft'),
  ('last_4', 'Last 4', 4, 8, 20, timezone('Asia/Kuala_Lumpur', '2026-07-06 23:59:00'::timestamp), 'draft'),
  ('finalists', 'Finalists', 2, 15, 20, timezone('Asia/Kuala_Lumpur', '2026-07-10 23:59:00'::timestamp), 'draft'),
  ('champion', 'Champion', 1, 30, 0, timezone('Asia/Kuala_Lumpur', '2026-07-13 23:59:00'::timestamp), 'draft')
on conflict (stage_key) do update set
  stage_name = excluded.stage_name,
  required_selection_count = excluded.required_selection_count,
  points_per_correct = excluded.points_per_correct,
  perfect_bonus_points = excluded.perfect_bonus_points,
  updated_at = now();

create or replace function public.save_road_prediction(
  p_stage_key text,
  p_team_ids uuid[],
  p_status text default 'submitted'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage public.prediction_stages;
  v_clean_team_ids uuid[];
begin
  if auth.uid() is null then
    raise exception 'Please login before submitting.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where auth_user_id = auth.uid()
      and profile_completed = true
      and coalesce(display_name, nickname) is not null
      and coalesce(phone, phone_number, whatsapp_number) is not null
      and is_blocked = false
  ) then
    raise exception 'Please complete your profile before playing.';
  end if;

  select * into v_stage
  from public.prediction_stages
  where stage_key = p_stage_key;

  if v_stage.id is null then
    raise exception 'Prediction stage not found.';
  end if;

  if v_stage.status in ('locked', 'scored') or now() >= v_stage.due_at then
    raise exception 'Prediction locked. Waiting for result.';
  end if;

  if v_stage.status <> 'open' then
    raise exception 'This prediction stage is not open yet.';
  end if;

  if p_status not in ('draft', 'submitted') then
    raise exception 'Invalid prediction status.';
  end if;

  select coalesce(array_agg(distinct team_id), '{}'::uuid[])
  into v_clean_team_ids
  from unnest(coalesce(p_team_ids, '{}'::uuid[])) as team_id
  where team_id is not null;

  if cardinality(v_clean_team_ids) > v_stage.required_selection_count then
    raise exception 'Too many teams selected.';
  end if;

  if p_status = 'submitted' and cardinality(v_clean_team_ids) <> v_stage.required_selection_count then
    raise exception 'Please select exactly % teams.', v_stage.required_selection_count;
  end if;

  if exists (
    select 1
    from unnest(v_clean_team_ids) selected_id
    left join public.teams t on t.id = selected_id
    where t.id is null
  ) then
    raise exception 'One or more selected teams are invalid.';
  end if;

  insert into public.user_stage_predictions (
    user_id,
    stage_key,
    selected_team_ids,
    status,
    submitted_at,
    updated_at
  )
  values (
    auth.uid(),
    p_stage_key,
    v_clean_team_ids,
    p_status,
    case when p_status = 'submitted' then now() else null end,
    now()
  )
  on conflict (user_id, stage_key) do update set
    selected_team_ids = excluded.selected_team_ids,
    status = excluded.status,
    submitted_at = case when excluded.status = 'submitted' then now() else user_stage_predictions.submitted_at end,
    updated_at = now();
end;
$$;

create or replace function public.admin_update_prediction_stage(
  p_stage_key text,
  p_due_at timestamptz,
  p_status text,
  p_points_per_correct int,
  p_perfect_bonus_points int
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_status not in ('draft', 'open', 'locked', 'scored') then
    raise exception 'Invalid stage status.';
  end if;

  if p_status = 'open' and p_due_at <= now() then
    raise exception 'Open stages need a future due date.';
  end if;

  update public.prediction_stages
  set due_at = p_due_at,
      status = p_status,
      points_per_correct = greatest(0, p_points_per_correct),
      perfect_bonus_points = greatest(0, p_perfect_bonus_points),
      updated_at = now()
  where stage_key = p_stage_key;

  if not found then
    raise exception 'Prediction stage not found.';
  end if;
end;
$$;

create or replace function public.admin_save_stage_result(
  p_stage_key text,
  p_team_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage public.prediction_stages;
  v_admin_profile_id uuid := public.current_profile_id();
  v_clean_team_ids uuid[];
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select * into v_stage
  from public.prediction_stages
  where stage_key = p_stage_key;

  if v_stage.id is null then
    raise exception 'Prediction stage not found.';
  end if;

  select coalesce(array_agg(distinct team_id), '{}'::uuid[])
  into v_clean_team_ids
  from unnest(coalesce(p_team_ids, '{}'::uuid[])) as team_id
  where team_id is not null;

  if cardinality(v_clean_team_ids) <> v_stage.required_selection_count then
    raise exception 'Official result needs exactly % teams.', v_stage.required_selection_count;
  end if;

  insert into public.stage_results (
    stage_key,
    official_team_ids,
    confirmed_by_admin_id,
    confirmed_at,
    updated_at
  )
  values (
    p_stage_key,
    v_clean_team_ids,
    v_admin_profile_id,
    now(),
    now()
  )
  on conflict (stage_key) do update set
    official_team_ids = excluded.official_team_ids,
    confirmed_by_admin_id = excluded.confirmed_by_admin_id,
    confirmed_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.admin_calculate_road_stage_score(p_stage_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage public.prediction_stages;
  v_result public.stage_results;
  v_prediction record;
  v_correct_count int;
  v_bonus int;
  v_points int;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select * into v_stage
  from public.prediction_stages
  where stage_key = p_stage_key;

  if v_stage.id is null then
    raise exception 'Prediction stage not found.';
  end if;

  if v_stage.status = 'scored' then
    raise exception 'This stage has already been scored.';
  end if;

  select * into v_result
  from public.stage_results
  where stage_key = p_stage_key;

  if v_result.id is null then
    raise exception 'Enter official result before calculating score.';
  end if;

  for v_prediction in
    select *
    from public.user_stage_predictions
    where stage_key = p_stage_key
      and status in ('submitted', 'locked')
  loop
    select count(*)::int
    into v_correct_count
    from unnest(v_prediction.selected_team_ids) selected_id
    where selected_id = any(v_result.official_team_ids);

    v_bonus := case
      when v_correct_count = v_stage.required_selection_count then v_stage.perfect_bonus_points
      else 0
    end;
    v_points := (v_correct_count * v_stage.points_per_correct) + v_bonus;

    update public.user_stage_predictions
    set correct_count = v_correct_count,
        bonus_earned = v_bonus,
        points_earned = v_points,
        status = 'scored',
        updated_at = now()
    where id = v_prediction.id;

    insert into public.point_transactions (
      user_id,
      source_type,
      stage_key,
      points,
      description
    )
    values (
      v_prediction.user_id,
      'road_to_champion',
      p_stage_key,
      v_points,
      v_stage.stage_name || ' score'
    )
    on conflict (user_id, source_type, stage_key) do nothing;
  end loop;

  update public.prediction_stages
  set status = 'scored',
      updated_at = now()
  where stage_key = p_stage_key;
end;
$$;

create or replace function public.get_road_to_champion_leaderboard(p_limit int default 100)
returns table (
  profile_id uuid,
  user_id uuid,
  display_name text,
  total_points int,
  rank_position int
)
language sql
security definer
set search_path = public
as $$
  with totals as (
    select
      p.id as profile_id,
      p.auth_user_id as user_id,
      coalesce(p.nickname, p.display_name, 'Player') as display_name,
      coalesce(sum(pt.points) filter (where pt.source_type in ('early_signup', 'referral', 'road_to_champion')), 0)::int as total_points,
      p.created_at
    from public.profiles p
    left join public.point_transactions pt on pt.user_id = p.auth_user_id
    where p.role = 'player'
      and p.is_blocked = false
    group by p.id, p.auth_user_id, p.nickname, p.display_name, p.created_at
  ),
  ranked as (
    select
      *,
      row_number() over (order by total_points desc, created_at asc)::int as rank_position
    from totals
  )
  select profile_id, user_id, display_name, total_points, rank_position
  from ranked
  order by rank_position
  limit greatest(1, least(coalesce(p_limit, 100), 500));
$$;

grant execute on function public.save_road_prediction(text, uuid[], text) to authenticated;
grant execute on function public.admin_update_prediction_stage(text, timestamptz, text, int, int) to authenticated;
grant execute on function public.admin_save_stage_result(text, uuid[]) to authenticated;
grant execute on function public.admin_calculate_road_stage_score(text) to authenticated;
grant execute on function public.get_road_to_champion_leaderboard(int) to authenticated;
