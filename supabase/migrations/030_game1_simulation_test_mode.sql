alter table public.profiles
add column if not exists is_simulation boolean not null default false;

alter table public.teams
add column if not exists is_simulation boolean not null default false;

alter table public.squad_teams
add column if not exists is_simulation boolean not null default false;

alter table public.squad_team_members
add column if not exists is_simulation boolean not null default false;

alter table public.user_stage_predictions
add column if not exists is_simulation boolean not null default false;

alter table public.stage_results
add column if not exists is_simulation boolean not null default false;

alter table public.point_transactions
add column if not exists is_simulation boolean not null default false;

do $$
begin
  alter table public.stage_results drop constraint if exists stage_results_stage_key_key;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'stage_results_stage_key_simulation_key'
      and conrelid = 'public.stage_results'::regclass
  ) then
    alter table public.stage_results
      add constraint stage_results_stage_key_simulation_key unique (stage_key, is_simulation);
  end if;
end $$;

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
    is_simulation,
    updated_at
  )
  values (
    p_stage_key,
    v_clean_team_ids,
    v_admin_profile_id,
    now(),
    false,
    now()
  )
  on conflict (stage_key, is_simulation) do update set
    official_team_ids = excluded.official_team_ids,
    confirmed_by_admin_id = excluded.confirmed_by_admin_id,
    confirmed_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.admin_calculate_road_stage_score_for(
  p_stage_key text,
  p_is_simulation boolean default false
)
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

  if not p_is_simulation and v_stage.status = 'scored' then
    raise exception 'This stage has already been scored.';
  end if;

  select * into v_result
  from public.stage_results
  where stage_key = p_stage_key
    and is_simulation = p_is_simulation;

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
    and usp.is_simulation = p_is_simulation
    and usp.status in ('submitted', 'locked');

  for v_prediction in
    select usp.*, p.id as profile_id
    from public.user_stage_predictions usp
    join public.profiles p on p.auth_user_id = usp.user_id
    where usp.stage_key = p_stage_key
      and usp.is_simulation = p_is_simulation
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
      and stm.is_simulation = p_is_simulation
      and stm.joined_at <= coalesce(v_stage.due_at, now())
      and (
        select count(*)::int
        from public.squad_team_members members
        where members.team_id = stm.team_id
          and members.is_simulation = p_is_simulation
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
        and members.is_simulation = p_is_simulation
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
      description,
      is_simulation
    )
    values (
      v_prediction.user_id,
      'road_to_champion',
      p_stage_key,
      v_final_points,
      v_stage.stage_name || ' final earned score',
      p_is_simulation
    )
    on conflict (user_id, source_type, stage_key) do update set
      points = excluded.points,
      description = excluded.description,
      is_simulation = excluded.is_simulation;
  end loop;

  if not p_is_simulation then
    update public.prediction_stages
    set status = 'scored',
        updated_at = now()
    where stage_key = p_stage_key;
  end if;
end;
$$;

create or replace function public.admin_calculate_road_stage_score(p_stage_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.admin_calculate_road_stage_score_for(p_stage_key, false);
end;
$$;

create or replace function public.admin_clear_game1_simulation_data()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_ids uuid[];
  v_user_ids uuid[];
  v_team_ids uuid[];
  v_deleted_profiles int := 0;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  select coalesce(array_agg(id), '{}'::uuid[]), coalesce(array_agg(auth_user_id), '{}'::uuid[])
  into v_profile_ids, v_user_ids
  from public.profiles
  where is_simulation = true
     or email like 'game1-sim-%@brainwave.local';

  select coalesce(array_agg(id), '{}'::uuid[])
  into v_team_ids
  from public.squad_teams
  where is_simulation = true
     or owner_profile_id = any(v_profile_ids);

  delete from public.point_transactions
  where is_simulation = true
     or user_id = any(v_user_ids);

  delete from public.user_stage_predictions
  where is_simulation = true
     or user_id = any(v_user_ids);

  delete from public.stage_results
  where is_simulation = true;

  delete from public.player_score_summaries
  where profile_id = any(v_profile_ids)
     or user_id = any(v_user_ids);

  delete from public.squad_team_score_summaries
  where team_id = any(v_team_ids);

  delete from public.squad_team_members
  where is_simulation = true
     or team_id = any(v_team_ids)
     or profile_id = any(v_profile_ids);

  delete from public.squad_teams
  where is_simulation = true
     or id = any(v_team_ids);

  delete from public.profiles
  where is_simulation = true
     or id = any(v_profile_ids);
  get diagnostics v_deleted_profiles = row_count;

  delete from auth.users
  where id = any(v_user_ids)
     or email like 'game1-sim-%@brainwave.local';

  delete from public.teams
  where is_simulation = true;

  perform public.rebuild_final_score_summaries();

  return jsonb_build_object(
    'ok', true,
    'deleted_profiles', v_deleted_profiles,
    'message', 'Game 1 simulation data cleared.'
  );
end;
$$;

create or replace function public.admin_run_game1_simulation()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage text;
  v_validation_errors text[] := '{}';
  v_player_count int;
  v_team_count int;
  v_official_count int;
  v_missing_pick_count int;
  v_bad_team_count int;
  v_result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  perform public.admin_clear_game1_simulation_data();

  create temp table pg_temp.sim_country (
    country_name text primary key,
    team_id uuid
  ) on commit drop;

  insert into pg_temp.sim_country (country_name)
  select distinct country_name
  from unnest(array[
    'Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands',
    'Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Mexico','Canada',
    'Belgium','Senegal','Korea'
  ]) country_name;

  insert into public.teams (name, short_name, country_name, country_code, is_active, is_simulation)
  select
    sc.country_name,
    upper(left(sc.country_name, 3)),
    sc.country_name,
    upper(left(sc.country_name, 3)),
    true,
    true
  from pg_temp.sim_country sc
  where not exists (
    select 1
    from public.teams t
    where coalesce(t.country_name, t.name) = sc.country_name
  );

  update pg_temp.sim_country sc
  set team_id = t.id
  from public.teams t
  where coalesce(t.country_name, t.name) = sc.country_name;

  if exists (select 1 from pg_temp.sim_country where team_id is null) then
    raise exception 'Simulation country setup failed.';
  end if;

  create temp table pg_temp.sim_players (
    sort_order int primary key,
    nickname text not null,
    team_no int not null,
    is_owner boolean not null,
    auth_user_id uuid not null default gen_random_uuid(),
    profile_id uuid,
    squad_team_id uuid
  ) on commit drop;

  insert into pg_temp.sim_players (sort_order, nickname, team_no, is_owner)
  values
    (1, '乌龙王', 1, true),
    (2, '神猜哥', 1, false),
    (3, '反向明灯', 1, false),
    (4, '绝杀佬', 1, false),
    (5, '加时王', 1, false),
    (6, '越位哥', 2, true),
    (7, '点球侠', 2, false),
    (8, '香蕉脚', 2, false),
    (9, '门柱之子', 2, false),
    (10, '玄学大师', 2, false);

  insert into auth.users (
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    sp.auth_user_id,
    'authenticated',
    'authenticated',
    'game1-sim-' || sp.sort_order || '@brainwave.local',
    crypt('simulation-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('display_name', sp.nickname),
    now(),
    now()
  from pg_temp.sim_players sp;

  insert into public.profiles (
    auth_user_id,
    user_id,
    role,
    display_name,
    nickname,
    phone,
    phone_number,
    whatsapp_number,
    email,
    login_provider,
    provider,
    auth_provider,
    referral_code,
    profile_completed,
    email_verified,
    preferred_language,
    is_simulation,
    created_at,
    updated_at
  )
  select
    sp.auth_user_id,
    sp.auth_user_id,
    'player',
    '模拟-' || sp.nickname,
    sp.nickname,
    '0100000' || lpad(sp.sort_order::text, 3, '0'),
    '0100000' || lpad(sp.sort_order::text, 3, '0'),
    '0100000' || lpad(sp.sort_order::text, 3, '0'),
    'game1-sim-' || sp.sort_order || '@brainwave.local',
    'email',
    'email',
    'email',
    'SIM' || lpad(sp.sort_order::text, 6, '0'),
    true,
    true,
    'zh',
    true,
    now(),
    now()
  from pg_temp.sim_players sp;

  update pg_temp.sim_players sp
  set profile_id = p.id
  from public.profiles p
  where p.auth_user_id = sp.auth_user_id;

  create temp table pg_temp.sim_squads (
    team_no int primary key,
    team_name text not null,
    owner_profile_id uuid,
    squad_team_id uuid
  ) on commit drop;

  insert into pg_temp.sim_squads (team_no, team_name, owner_profile_id)
  select 1, '乌龙王的第1队', profile_id
  from pg_temp.sim_players
  where sort_order = 1
  union all
  select 2, '越位哥的第1队', profile_id
  from pg_temp.sim_players
  where sort_order = 6;

  insert into public.squad_teams (
    owner_profile_id,
    team_no,
    team_name,
    status,
    is_simulation,
    created_at,
    updated_at
  )
  select owner_profile_id, 1, team_name, 'full', true, now(), now()
  from pg_temp.sim_squads;

  update pg_temp.sim_squads ss
  set squad_team_id = st.id
  from public.squad_teams st
  where st.owner_profile_id = ss.owner_profile_id
    and st.team_no = 1
    and st.is_simulation = true;

  update pg_temp.sim_players sp
  set squad_team_id = ss.squad_team_id
  from pg_temp.sim_squads ss
  where ss.team_no = sp.team_no;

  insert into public.squad_team_members (
    team_id,
    profile_id,
    member_role,
    joined_at,
    is_simulation
  )
  select
    sp.squad_team_id,
    sp.profile_id,
    case when sp.is_owner then 'owner' else 'member' end,
    now() - interval '1 day',
    true
  from pg_temp.sim_players sp;

  update public.profiles p
  set primary_team_id = sp.squad_team_id,
      updated_at = now()
  from pg_temp.sim_players sp
  where p.id = sp.profile_id;

  create temp table pg_temp.sim_official_results (
    stage_key text primary key,
    country_names text[] not null
  ) on commit drop;

  insert into pg_temp.sim_official_results (stage_key, country_names)
  values
    ('last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Mexico']),
    ('last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Netherlands','Colombia']),
    ('last_4', array['Argentina','France','Spain','Portugal']),
    ('finalists', array['Argentina','Spain']),
    ('champion', array['Argentina']);

  insert into public.stage_results (
    stage_key,
    official_team_ids,
    confirmed_by_admin_id,
    confirmed_at,
    is_simulation,
    updated_at
  )
  select
    sor.stage_key,
    array(
      select sc.team_id
      from pg_temp.sim_country sc
      where sc.country_name = any(sor.country_names)
    ),
    public.current_profile_id(),
    now(),
    true,
    now()
  from pg_temp.sim_official_results sor
  on conflict (stage_key, is_simulation) do update set
    official_team_ids = excluded.official_team_ids,
    confirmed_by_admin_id = excluded.confirmed_by_admin_id,
    confirmed_at = now(),
    updated_at = now();

  create temp table pg_temp.sim_picks (
    sort_order int not null,
    stage_key text not null,
    country_names text[] not null,
    primary key (sort_order, stage_key)
  ) on commit drop;

  insert into pg_temp.sim_picks (sort_order, stage_key, country_names)
  values
    (1, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Canada']),
    (1, 'last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Netherlands','England']),
    (1, 'last_4', array['Argentina','France','Spain','Brazil']),
    (1, 'finalists', array['Argentina','Spain']),
    (1, 'champion', array['Argentina']),
    (2, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','Mexico','Canada']),
    (2, 'last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Colombia','Uruguay']),
    (2, 'last_4', array['Argentina','France','Portugal','Germany']),
    (2, 'finalists', array['Argentina','France']),
    (2, 'champion', array['France']),
    (3, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','USA','Mexico','Japan','Morocco','Belgium','Senegal']),
    (3, 'last_8', array['Argentina','Brazil','France','England','Spain','Portugal','Netherlands','Japan']),
    (3, 'last_4', array['Argentina','Brazil','France','Spain']),
    (3, 'finalists', array['Argentina','Brazil']),
    (3, 'champion', array['Brazil']),
    (4, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Mexico']),
    (4, 'last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Netherlands','Colombia']),
    (4, 'last_4', array['Argentina','France','Spain','Portugal']),
    (4, 'finalists', array['Argentina','Spain']),
    (4, 'champion', array['Argentina']),
    (5, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Mexico']),
    (5, 'last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Netherlands','Colombia']),
    (5, 'last_4', array['Argentina','France','Spain','Portugal']),
    (5, 'finalists', array['Argentina','Spain']),
    (5, 'champion', array['Argentina']),
    (6, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Korea']),
    (6, 'last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Netherlands','Italy']),
    (6, 'last_4', array['Argentina','France','Portugal','Netherlands']),
    (6, 'finalists', array['Argentina','Portugal']),
    (6, 'champion', array['Argentina']),
    (7, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Mexico']),
    (7, 'last_8', array['Argentina','France','Spain','Germany','Portugal','Netherlands','Colombia','Japan']),
    (7, 'last_4', array['Argentina','France','Spain','Germany']),
    (7, 'finalists', array['France','Spain']),
    (7, 'champion', array['Spain']),
    (8, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','Belgium','Mexico']),
    (8, 'last_8', array['Brazil','France','Spain','Germany','Portugal','Netherlands','Colombia','Mexico']),
    (8, 'last_4', array['Brazil','France','Spain','Portugal']),
    (8, 'finalists', array['Brazil','Spain']),
    (8, 'champion', array['Spain']),
    (9, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Mexico']),
    (9, 'last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Netherlands','Colombia']),
    (9, 'last_4', array['Argentina','France','Spain','Portugal']),
    (9, 'finalists', array['Argentina','Spain']),
    (9, 'champion', array['Argentina']),
    (10, 'last_16', array['Argentina','Brazil','France','England','Spain','Germany','Portugal','Netherlands','Italy','Croatia','Uruguay','Colombia','Japan','Morocco','USA','Mexico']),
    (10, 'last_8', array['Argentina','Brazil','France','Spain','Germany','Portugal','Netherlands','Colombia']),
    (10, 'last_4', array['Argentina','France','Spain','Portugal']),
    (10, 'finalists', array['Argentina','Spain']),
    (10, 'champion', array['Argentina']);

  insert into public.user_stage_predictions (
    user_id,
    stage_key,
    selected_team_ids,
    status,
    submitted_at,
    updated_at,
    is_simulation
  )
  select
    sp.auth_user_id,
    picks.stage_key,
    array(
      select sc.team_id
      from pg_temp.sim_country sc
      where sc.country_name = any(picks.country_names)
    ),
    'submitted',
    now() - interval '1 hour',
    now(),
    true
  from pg_temp.sim_picks picks
  join pg_temp.sim_players sp on sp.sort_order = picks.sort_order;

  select count(*) into v_player_count
  from public.profiles
  where is_simulation = true;

  if v_player_count <> 10 then
    v_validation_errors := array_append(v_validation_errors, 'Simulation must have exactly 10 players.');
  end if;

  select count(*) into v_team_count
  from public.squad_teams
  where is_simulation = true;

  if v_team_count <> 2 then
    v_validation_errors := array_append(v_validation_errors, 'Simulation must have exactly 2 teams.');
  end if;

  select count(*) into v_bad_team_count
  from (
    select st.id
    from public.squad_teams st
    left join public.squad_team_members stm on stm.team_id = st.id
    where st.is_simulation = true
    group by st.id
    having count(stm.id) <> 5
  ) bad_teams;

  if v_bad_team_count <> 0 then
    v_validation_errors := array_append(v_validation_errors, 'Each simulation team must have exactly 5 members.');
  end if;

  select count(*) into v_missing_pick_count
  from pg_temp.sim_players sp
  cross join unnest(array['last_16','last_8','last_4','finalists','champion']) stage_key
  left join public.user_stage_predictions usp
    on usp.user_id = sp.auth_user_id
    and usp.stage_key = stage_key
    and usp.is_simulation = true
  where usp.id is null;

  if v_missing_pick_count <> 0 then
    v_validation_errors := array_append(v_validation_errors, 'Every simulation player must have Game 1 picks.');
  end if;

  select count(*) into v_official_count
  from public.stage_results
  where is_simulation = true
    and stage_key in ('last_16','last_8','last_4','finalists','champion');

  if v_official_count <> 5 then
    v_validation_errors := array_append(v_validation_errors, 'Official simulation result is missing.');
  end if;

  if cardinality(v_validation_errors) > 0 then
    raise exception 'Game 1 simulation validation failed: %', array_to_string(v_validation_errors, ' ');
  end if;

  foreach v_stage in array array['last_16','last_8','last_4','finalists','champion']
  loop
    perform public.admin_calculate_road_stage_score_for(v_stage, true);
  end loop;

  perform public.rebuild_final_score_summaries();

  with player_rows as (
    select
      p.id as profile_id,
      p.auth_user_id,
      p.nickname,
      st.team_name,
      coalesce(max(usp.correct_count) filter (where usp.stage_key = 'last_16'), 0)::int as last_16_correct_count,
      coalesce(max(usp.personal_correct_score) filter (where usp.stage_key = 'last_16'), 0)::int as last_16_points,
      coalesce(max(usp.correct_count) filter (where usp.stage_key = 'last_8'), 0)::int as last_8_correct_count,
      coalesce(max(usp.personal_correct_score) filter (where usp.stage_key = 'last_8'), 0)::int as last_8_points,
      coalesce(max(usp.correct_count) filter (where usp.stage_key = 'last_4'), 0)::int as last_4_correct_count,
      coalesce(max(usp.personal_correct_score) filter (where usp.stage_key = 'last_4'), 0)::int as last_4_points,
      coalesce(max(usp.correct_count) filter (where usp.stage_key = 'finalists'), 0)::int as finalists_correct_count,
      coalesce(max(usp.personal_correct_score) filter (where usp.stage_key = 'finalists'), 0)::int as finalists_points,
      coalesce(max(usp.correct_count) filter (where usp.stage_key = 'champion'), 0)::int as champion_correct_count,
      coalesce(max(usp.personal_correct_score) filter (where usp.stage_key = 'champion'), 0)::int as champion_points,
      coalesce(sum(usp.personal_correct_score), 0)::int as game1_individual_score,
      coalesce(sum(usp.team_accumulated_score), 0)::int as game1_team_accumulated_score,
      coalesce(sum(usp.final_earned_score), 0)::int as game1_final_earned_score,
      min(sp.sort_order) as sort_order
    from public.profiles p
    join pg_temp.sim_players sp on sp.profile_id = p.id
    join public.squad_team_members stm on stm.profile_id = p.id and stm.is_simulation = true
    join public.squad_teams st on st.id = stm.team_id and st.is_simulation = true
    left join public.user_stage_predictions usp
      on usp.user_id = p.auth_user_id
      and usp.is_simulation = true
      and usp.status = 'scored'
    where p.is_simulation = true
    group by p.id, p.auth_user_id, p.nickname, st.team_name
  ),
  team_rows as (
    select
      st.id as team_id,
      st.team_name,
      count(distinct p.id)::int as member_count,
      array_agg(p.nickname order by sp.sort_order) as members,
      coalesce(sum(player_totals.game1_individual_score), 0)::int as game1_team_accumulated_score
    from public.squad_teams st
    join public.squad_team_members stm on stm.team_id = st.id and stm.is_simulation = true
    join public.profiles p on p.id = stm.profile_id and p.is_simulation = true
    join pg_temp.sim_players sp on sp.profile_id = p.id
    left join (
      select user_id, sum(personal_correct_score)::int as game1_individual_score
      from public.user_stage_predictions
      where is_simulation = true
        and status = 'scored'
      group by user_id
    ) player_totals on player_totals.user_id = p.auth_user_id
    where st.is_simulation = true
    group by st.id, st.team_name
  ),
  raw_predictions as (
    select
      p.nickname,
      jsonb_object_agg(
        picks.stage_key,
        to_jsonb(array(
          select sc.country_name
          from pg_temp.sim_country sc
          where sc.country_name = any(picks.country_names)
        ))
        order by picks.stage_key
      ) as picks
    from pg_temp.sim_picks picks
    join pg_temp.sim_players sp on sp.sort_order = picks.sort_order
    join public.profiles p on p.id = sp.profile_id
    group by p.nickname, sp.sort_order
    order by sp.sort_order
  ),
  raw_official as (
    select jsonb_object_agg(
      sor.stage_key,
      to_jsonb(sor.country_names)
    ) as official_result
    from pg_temp.sim_official_results sor
  )
  select jsonb_build_object(
    'ok', true,
    'message', '游戏一模拟测试完成。分数已由真实游戏一计分逻辑自动生成。',
    'message_en', 'Game 1 simulation completed. Scores were generated by the real Game 1 scoring logic.',
    'validation', jsonb_build_object(
      'player_count', v_player_count,
      'team_count', v_team_count,
      'bad_team_count', v_bad_team_count,
      'missing_pick_count', v_missing_pick_count,
      'official_result_count', v_official_count
    ),
    'player_scores', (
      select coalesce(jsonb_agg(to_jsonb(player_rows) order by sort_order), '[]'::jsonb)
      from player_rows
    ),
    'team_summary', (
      select coalesce(jsonb_agg(to_jsonb(team_rows) order by team_name), '[]'::jsonb)
      from team_rows
    ),
    'raw', jsonb_build_object(
      'official_result', (select official_result from raw_official),
      'player_predictions', (
        select coalesce(jsonb_agg(to_jsonb(raw_predictions)), '[]'::jsonb)
        from raw_predictions
      ),
      'team_members', (
        select coalesce(jsonb_agg(to_jsonb(team_rows) order by team_name), '[]'::jsonb)
        from team_rows
      ),
      'calculated_json', (
        select coalesce(jsonb_agg(to_jsonb(player_rows) order by sort_order), '[]'::jsonb)
        from player_rows
      )
    )
  )
  into v_result;

  return v_result;
end;
$$;

grant execute on function public.admin_calculate_road_stage_score_for(text, boolean) to authenticated;
grant execute on function public.admin_clear_game1_simulation_data() to authenticated;
grant execute on function public.admin_run_game1_simulation() to authenticated;

create or replace function public.get_leaderboard(
  p_game_id uuid default null,
  p_round_id uuid default null,
  p_scope text default 'overall'
)
returns table (
  profile_id uuid,
  display_name text,
  avatar_url text,
  total_score int,
  round_score int,
  correct_predictions int,
  total_predictions int,
  accuracy_rate numeric,
  rank_position int,
  previous_rank_position int,
  invite_count int
)
language sql
security definer
set search_path = public
as $$
  with invite_counts as (
    select referrer_profile_id as profile_id, count(*)::int as invite_count
    from public.referrals
    group by referrer_profile_id
  ),
  prediction_counts as (
    select
      smp.user_id,
      count(*)::int as total_predictions,
      count(*) filter (where smp.is_correct)::int as correct_predictions
    from public.solo_match_predictions smp
    join public.profiles p on p.auth_user_id = smp.user_id
    where p_scope in ('overall', 'squad')
      and coalesce(p.is_simulation, false) = false
    group by smp.user_id

    union all

    select
      usp.user_id,
      count(*)::int as total_predictions,
      coalesce(sum(usp.correct_count), 0)::int as correct_predictions
    from public.user_stage_predictions usp
    join public.profiles p on p.auth_user_id = usp.user_id
    where p_scope in ('overall', 'round')
      and coalesce(p.is_simulation, false) = false
      and coalesce(usp.is_simulation, false) = false
    group by usp.user_id
  ),
  prediction_totals as (
    select
      user_id,
      sum(total_predictions)::int as total_predictions,
      sum(correct_predictions)::int as correct_predictions
    from prediction_counts
    group by user_id
  ),
  player_rows as (
    select
      p.id as profile_id,
      coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), nullif(p.email, ''), 'Player') as display_name,
      p.avatar_url,
      case
        when p_scope = 'round' then coalesce(pss.game1_final_earned_score, 0)
        when p_scope = 'squad' then coalesce(pss.game2_final_earned_score, 0)
        else coalesce(pss.individual_final_score, 0)
      end::int as total_score,
      case
        when p_scope = 'round' then coalesce(pss.game1_final_earned_score, 0)
        when p_scope = 'squad' then coalesce(pss.game2_final_earned_score, 0)
        else coalesce(pss.individual_final_score, 0)
      end::int as round_score,
      coalesce(pc.correct_predictions, 0)::int as correct_predictions,
      coalesce(pc.total_predictions, 0)::int as total_predictions,
      case
        when coalesce(pc.total_predictions, 0) = 0 then 0
        else round((coalesce(pc.correct_predictions, 0)::numeric / pc.total_predictions::numeric) * 100, 2)
      end as accuracy_rate,
      null::int as previous_rank_position,
      coalesce(ic.invite_count, 0)::int as invite_count,
      p.created_at
    from public.profiles p
    left join public.player_score_summaries pss on pss.profile_id = p.id
    left join prediction_totals pc on pc.user_id = p.auth_user_id
    left join invite_counts ic on ic.profile_id = p.id
    where p.role = 'player'
      and coalesce(p.is_blocked, false) = false
      and coalesce(p.is_simulation, false) = false
      and p_scope <> 'invite'
  ),
  team_rows as (
    select
      st.owner_profile_id as profile_id,
      coalesce(st.team_name, 'Team ' || st.team_no) as display_name,
      null::text as avatar_url,
      coalesce(stss.team_final_score, 0)::int as total_score,
      coalesce(stss.team_final_score, 0)::int as round_score,
      0::int as correct_predictions,
      0::int as total_predictions,
      0::numeric as accuracy_rate,
      null::int as previous_rank_position,
      coalesce(stss.member_count, 0)::int as invite_count,
      st.created_at
    from public.squad_teams st
    left join public.squad_team_score_summaries stss on stss.team_id = st.id
    where p_scope = 'invite'
      and coalesce(st.is_simulation, false) = false
      and coalesce(stss.member_count, 0) >= 2
  ),
  base_scores as (
    select * from player_rows
    union all
    select * from team_rows
  ),
  ranked as (
    select
      *,
      row_number() over (
        order by total_score desc, invite_count desc, created_at asc
      )::int as computed_rank
    from base_scores
  )
  select
    profile_id,
    display_name,
    avatar_url,
    total_score,
    round_score,
    correct_predictions,
    total_predictions,
    accuracy_rate,
    computed_rank as rank_position,
    previous_rank_position,
    invite_count
  from ranked
  order by computed_rank
  limit 100;
$$;

grant execute on function public.get_leaderboard(uuid, uuid, text) to anon, authenticated;
