alter table public.prediction_stages
add column if not exists kickoff_at timestamptz,
add column if not exists deadline_confirmed boolean not null default false,
add column if not exists deadline_source text not null default 'pending_fixture';

alter table public.user_stage_predictions
add column if not exists personal_correct_score int not null default 0,
add column if not exists team_accumulated_score int not null default 0,
add column if not exists final_earned_score int not null default 0;

update public.prediction_stages
set points_per_correct = case
    when stage_key = 'last_16' then 1
    when stage_key = 'last_8' then 2
    when stage_key = 'last_4' then 4
    when stage_key = 'finalists' then 6
    when stage_key = 'champion' then 10
    else points_per_correct
  end,
  perfect_bonus_points = 0,
  deadline_confirmed = case
    when stage_key = 'last_16' then false
    else true
  end,
  deadline_source = case
    when stage_key = 'last_16' then 'pending_fixture'
    else 'manual'
  end,
  updated_at = now()
where stage_key in ('last_16', 'last_8', 'last_4', 'finalists', 'champion');

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
      and coalesce(is_blocked, false) = false
  ) then
    raise exception 'Please complete your profile before playing.';
  end if;

  select * into v_stage
  from public.prediction_stages
  where stage_key = p_stage_key;

  if v_stage.id is null then
    raise exception 'Prediction stage not found.';
  end if;

  if v_stage.status in ('locked', 'scored') or (v_stage.deadline_confirmed and now() >= v_stage.due_at) then
    raise exception 'Prediction closed. Answers cannot be submitted or edited after the deadline.';
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
  v_personal_points int;
  v_team_points int;
  v_final_points int;
  v_team_id uuid;
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

  create temp table if not exists pg_temp.road_stage_personal_scores (
    user_id uuid primary key,
    profile_id uuid,
    correct_count int,
    personal_points int
  ) on commit drop;

  truncate table pg_temp.road_stage_personal_scores;

  insert into pg_temp.road_stage_personal_scores (
    user_id,
    profile_id,
    correct_count,
    personal_points
  )
  select
    usp.user_id,
    p.id,
    (
      select count(*)::int
      from unnest(usp.selected_team_ids) selected_id
      where selected_id = any(v_result.official_team_ids)
    ) as correct_count,
    (
      (
        select count(*)::int
        from unnest(usp.selected_team_ids) selected_id
        where selected_id = any(v_result.official_team_ids)
      ) * v_stage.points_per_correct
    ) as personal_points
  from public.user_stage_predictions usp
  join public.profiles p on p.auth_user_id = usp.user_id
  where usp.stage_key = p_stage_key
    and usp.status in ('submitted', 'locked');

  for v_prediction in
    select usp.*, p.id as profile_id
    from public.user_stage_predictions usp
    join public.profiles p on p.auth_user_id = usp.user_id
    where usp.stage_key = p_stage_key
      and usp.status in ('submitted', 'locked')
  loop
    select ps.correct_count, ps.personal_points
    into v_correct_count, v_personal_points
    from pg_temp.road_stage_personal_scores ps
    where ps.user_id = v_prediction.user_id;

    v_team_id := null;
    v_team_points := 0;

    select stm.team_id
    into v_team_id
    from public.squad_team_members stm
    where stm.profile_id = v_prediction.profile_id
      and stm.joined_at <= coalesce(v_stage.due_at, now())
      and (
        select count(*)::int
        from public.squad_team_members members
        where members.team_id = stm.team_id
          and members.joined_at <= coalesce(v_stage.due_at, now())
      ) >= 2
    order by stm.joined_at asc
    limit 1;

    if v_team_id is not null then
      select coalesce(sum(ps.personal_points), 0)::int
      into v_team_points
      from public.squad_team_members members
      join public.profiles p on p.id = members.profile_id
      join pg_temp.road_stage_personal_scores ps on ps.user_id = p.auth_user_id
      where members.team_id = v_team_id
        and members.joined_at <= coalesce(v_stage.due_at, now());
    end if;

    v_final_points := coalesce(v_personal_points, 0) + coalesce(v_team_points, 0);

    update public.user_stage_predictions
    set correct_count = coalesce(v_correct_count, 0),
        bonus_earned = 0,
        points_earned = v_final_points,
        personal_correct_score = coalesce(v_personal_points, 0),
        team_accumulated_score = coalesce(v_team_points, 0),
        final_earned_score = v_final_points,
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
      v_final_points,
      v_stage.stage_name || ' final earned score'
    )
    on conflict (user_id, source_type, stage_key) do update set
      points = excluded.points,
      description = excluded.description;
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
      coalesce(sum(pt.points) filter (where pt.source_type = 'road_to_champion'), 0)::int as total_points,
      p.created_at
    from public.profiles p
    left join public.point_transactions pt on pt.user_id = p.auth_user_id
    where p.role = 'player'
      and coalesce(p.is_blocked, false) = false
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
grant execute on function public.admin_calculate_road_stage_score(text) to authenticated;
grant execute on function public.get_road_to_champion_leaderboard(int) to authenticated;
