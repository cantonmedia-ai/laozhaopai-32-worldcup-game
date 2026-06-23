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
    (1, 'ä¹Œé¾™çŽ‹', 1, true),
    (2, 'ç¥žçŒœå“¥', 1, false),
    (3, 'åå‘æ˜Žç¯', 1, false),
    (4, 'ç»æ€ä½¬', 1, false),
    (5, 'åŠ æ—¶çŽ‹', 1, false),
    (6, 'è¶Šä½å“¥', 2, true),
    (7, 'ç‚¹çƒä¾ ', 2, false),
    (8, 'é¦™è•‰è„š', 2, false),
    (9, 'é—¨æŸ±ä¹‹å­', 2, false),
    (10, 'çŽ„å­¦å¤§å¸ˆ', 2, false);

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
    'æ¨¡æ‹Ÿ-' || sp.nickname,
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
  select 1, 'ä¹Œé¾™çŽ‹çš„ç¬¬1é˜Ÿ', profile_id
  from pg_temp.sim_players
  where sort_order = 1
  union all
  select 2, 'è¶Šä½å“¥çš„ç¬¬1é˜Ÿ', profile_id
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
  cross join unnest(array['last_16','last_8','last_4','finalists','champion']) as expected(expected_stage_key)
  left join public.user_stage_predictions usp
    on usp.user_id = sp.auth_user_id
    and usp.stage_key = expected.expected_stage_key
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
    'message', 'æ¸¸æˆä¸€æ¨¡æ‹Ÿæµ‹è¯•å®Œæˆã€‚åˆ†æ•°å·²ç”±çœŸå®žæ¸¸æˆä¸€è®¡åˆ†é€»è¾‘è‡ªåŠ¨ç”Ÿæˆã€‚',
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


