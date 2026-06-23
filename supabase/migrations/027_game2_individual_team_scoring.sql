alter table public.knockout_matches
add column if not exists team_a_score int,
add column if not exists team_b_score int;

alter table public.solo_match_predictions
add column if not exists predicted_team_a_score int,
add column if not exists predicted_team_b_score int,
add column if not exists individual_match_score int not null default 0,
add column if not exists team_accumulated_score int not null default 0,
add column if not exists final_earned_score int not null default 0;

alter table public.team_match_predictions
add column if not exists predicted_team_a_score int,
add column if not exists predicted_team_b_score int,
add column if not exists individual_match_score int not null default 0,
add column if not exists team_accumulated_score int not null default 0,
add column if not exists final_earned_score int not null default 0;

create or replace function public.knockout_round_points(p_round_key text)
returns int
language sql
immutable
as $$
  select case p_round_key
    when 'last_32' then 1
    when 'last_16' then 2
    when 'last_8' then 4
    when 'last_4' then 6
    when 'final' then 10
    else 0
  end
$$;

create or replace function public.game2_score_accuracy_points(
  p_predicted_team_a_score int,
  p_predicted_team_b_score int,
  p_actual_team_a_score int,
  p_actual_team_b_score int
)
returns int
language sql
immutable
as $$
  select case
    when p_predicted_team_a_score is null or p_predicted_team_b_score is null then 0
    when p_predicted_team_a_score = p_actual_team_a_score
     and p_predicted_team_b_score = p_actual_team_b_score then 3
    when p_predicted_team_a_score = p_actual_team_a_score
      or p_predicted_team_b_score = p_actual_team_b_score then 1
    else 0
  end
$$;

create or replace function public.save_solo_knockout_prediction(
  p_match_id uuid,
  p_selected_winner_team_id uuid,
  p_predicted_team_a_score int default null,
  p_predicted_team_b_score int default null
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

  if coalesce(p_predicted_team_a_score, -1) < 0
     or coalesce(p_predicted_team_b_score, -1) < 0 then
    raise exception 'Please enter a valid score for both countries.';
  end if;

  insert into public.solo_match_predictions (
    user_id,
    match_id,
    selected_winner_team_id,
    predicted_team_a_score,
    predicted_team_b_score,
    status,
    submitted_at,
    updated_at
  )
  values (
    auth.uid(),
    p_match_id,
    p_selected_winner_team_id,
    p_predicted_team_a_score,
    p_predicted_team_b_score,
    'submitted',
    now(),
    now()
  )
  on conflict (user_id, match_id) do update set
    selected_winner_team_id = excluded.selected_winner_team_id,
    predicted_team_a_score = excluded.predicted_team_a_score,
    predicted_team_b_score = excluded.predicted_team_b_score,
    status = 'submitted',
    submitted_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.save_team_knockout_prediction(
  p_match_id uuid,
  p_selected_winner_team_id uuid,
  p_predicted_team_a_score int default null,
  p_predicted_team_b_score int default null
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

  if coalesce(p_predicted_team_a_score, -1) < 0
     or coalesce(p_predicted_team_b_score, -1) < 0 then
    raise exception 'Please enter a valid score for both countries.';
  end if;

  insert into public.team_match_predictions (
    team_id,
    user_id,
    match_id,
    selected_winner_team_id,
    predicted_team_a_score,
    predicted_team_b_score,
    status,
    submitted_at,
    updated_at
  )
  values (
    v_team_id,
    auth.uid(),
    p_match_id,
    p_selected_winner_team_id,
    p_predicted_team_a_score,
    p_predicted_team_b_score,
    'submitted',
    now(),
    now()
  )
  on conflict (team_id, user_id, match_id) do update set
    selected_winner_team_id = excluded.selected_winner_team_id,
    predicted_team_a_score = excluded.predicted_team_a_score,
    predicted_team_b_score = excluded.predicted_team_b_score,
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
      coalesce(sum(tmp.individual_match_score), 0)::int as total_points,
      count(distinct gtm.user_id)::int as active_member_count
    from public.game_teams gt
    left join public.game_team_members gtm
      on gtm.team_id = gt.id
      and gtm.status = 'active'
    left join public.team_match_predictions tmp
      on tmp.team_id = gt.id
      and tmp.user_id = gtm.user_id
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
          total_points desc,
          active_member_count desc
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
  p_actual_winner_team_id uuid,
  p_team_a_score int default null,
  p_team_b_score int default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match public.knockout_matches;
  v_winner_points int;
  v_admin_profile_id uuid := public.current_profile_id();
begin
  if not public.is_admin() then
    raise exception 'Admin access required.';
  end if;

  if p_team_a_score is null or p_team_b_score is null
     or p_team_a_score < 0 or p_team_b_score < 0 then
    raise exception 'Enter official scores for both countries.';
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

  v_winner_points := public.knockout_round_points(v_match.round_key);

  update public.knockout_matches
  set actual_winner_team_id = p_actual_winner_team_id,
      team_a_score = p_team_a_score,
      team_b_score = p_team_b_score,
      status = 'completed',
      scored_at = now(),
      updated_at = now()
  where id = p_match_id;

  create temp table if not exists pg_temp.game2_solo_individual_scores (
    user_id uuid primary key,
    individual_score int not null
  ) on commit drop;

  truncate table pg_temp.game2_solo_individual_scores;

  insert into pg_temp.game2_solo_individual_scores (user_id, individual_score)
  select
    smp.user_id,
    (
      case when smp.selected_winner_team_id = p_actual_winner_team_id then v_winner_points else 0 end
      + public.game2_score_accuracy_points(
          smp.predicted_team_a_score,
          smp.predicted_team_b_score,
          p_team_a_score,
          p_team_b_score
        )
    )::int as individual_score
  from public.solo_match_predictions smp
  where smp.match_id = p_match_id;

  with player_team as (
    select distinct on (gtm.user_id)
      gt.id as team_id,
      gtm.user_id
    from public.game_team_members gtm
    join public.game_teams gt on gt.id = gtm.team_id and gt.status = 'active'
    where gtm.status = 'active'
      and gtm.joined_at <= coalesce(v_match.prediction_lock_at, now())
      and (
        select count(*)
        from public.game_team_members valid_member
        where valid_member.team_id = gtm.team_id
          and valid_member.status = 'active'
          and valid_member.joined_at <= coalesce(v_match.prediction_lock_at, now())
      ) between 2 and 5
    order by gtm.user_id, gtm.joined_at desc
  ),
  team_scores as (
    select
      pt.team_id,
      sum(sis.individual_score)::int as team_score
    from player_team pt
    join pg_temp.game2_solo_individual_scores sis on sis.user_id = pt.user_id
    group by pt.team_id
  )
  update public.solo_match_predictions smp
  set status = 'scored',
      is_correct = smp.selected_winner_team_id = p_actual_winner_team_id,
      individual_match_score = sis.individual_score,
      team_accumulated_score = coalesce(ts.team_score, 0),
      final_earned_score = sis.individual_score + coalesce(ts.team_score, 0),
      points_earned = sis.individual_score + coalesce(ts.team_score, 0),
      updated_at = now()
  from pg_temp.game2_solo_individual_scores sis
  left join player_team pt on pt.user_id = sis.user_id
  left join team_scores ts on ts.team_id = pt.team_id
  where smp.match_id = p_match_id
    and smp.user_id = sis.user_id
    and smp.status <> 'scored';

  create temp table if not exists pg_temp.game2_team_individual_scores (
    team_id uuid not null,
    user_id uuid not null,
    individual_score int not null,
    primary key (team_id, user_id)
  ) on commit drop;

  truncate table pg_temp.game2_team_individual_scores;

  insert into pg_temp.game2_team_individual_scores (team_id, user_id, individual_score)
  select
    tmp.team_id,
    tmp.user_id,
    (
      case when tmp.selected_winner_team_id = p_actual_winner_team_id then v_winner_points else 0 end
      + public.game2_score_accuracy_points(
          tmp.predicted_team_a_score,
          tmp.predicted_team_b_score,
          p_team_a_score,
          p_team_b_score
        )
    )::int as individual_score
  from public.team_match_predictions tmp
  where tmp.match_id = p_match_id;

  with valid_teams as (
    select gtm.team_id
    from public.game_team_members gtm
    where gtm.status = 'active'
      and gtm.joined_at <= coalesce(v_match.prediction_lock_at, now())
    group by gtm.team_id
    having count(*) between 2 and 5
  ),
  team_scores as (
    select tis.team_id, sum(tis.individual_score)::int as team_score
    from pg_temp.game2_team_individual_scores tis
    join valid_teams vt on vt.team_id = tis.team_id
    group by tis.team_id
  )
  update public.team_match_predictions tmp
  set status = 'scored',
      is_correct = tmp.selected_winner_team_id = p_actual_winner_team_id,
      individual_match_score = tis.individual_score,
      team_accumulated_score = coalesce(ts.team_score, 0),
      final_earned_score = tis.individual_score + coalesce(ts.team_score, 0),
      points_earned = tis.individual_score + coalesce(ts.team_score, 0),
      updated_at = now()
  from pg_temp.game2_team_individual_scores tis
  left join team_scores ts on ts.team_id = tis.team_id
  where tmp.match_id = p_match_id
    and tmp.team_id = tis.team_id
    and tmp.user_id = tis.user_id
    and tmp.status <> 'scored';

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
    final_earned_score,
    'Knockout Winner Challenge final earned score'
  from public.solo_match_predictions
  where match_id = p_match_id
    and final_earned_score > 0
  on conflict do nothing;

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
    final_earned_score,
    'Team Knockout Winner Challenge final earned score'
  from public.team_match_predictions
  where match_id = p_match_id
    and final_earned_score > 0
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
      'team_a_score', p_team_a_score,
      'team_b_score', p_team_b_score,
      'winner_points', v_winner_points
    ),
    'Knockout match result confirmed with individual and team accumulated scores'
  );
end;
$$;

grant execute on function public.game2_score_accuracy_points(int, int, int, int) to authenticated;
grant execute on function public.save_solo_knockout_prediction(uuid, uuid, int, int) to authenticated;
grant execute on function public.save_team_knockout_prediction(uuid, uuid, int, int) to authenticated;
grant execute on function public.admin_confirm_knockout_match_result(uuid, uuid, int, int) to authenticated;
grant execute on function public.rebuild_team_score_summary() to authenticated;

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
  score_totals as (
    select
      pt.user_id,
      sum(pt.points)::int as total_points
    from public.point_transactions pt
    where case
      when p_scope = 'round' then pt.source_type = 'road_to_champion'
      when p_scope = 'squad' then pt.source_type = 'knockout_winner_challenge'
      when p_scope = 'invite' then pt.source_type = 'team_knockout_winner_challenge'
      else pt.source_type in (
        'road_to_champion',
        'knockout_winner_challenge',
        'team_knockout_winner_challenge',
        'early_signup',
        'referral'
      )
    end
    group by pt.user_id
  ),
  prediction_counts as (
    select
      smp.user_id,
      count(*)::int as total_predictions,
      count(*) filter (where smp.is_correct)::int as correct_predictions
    from public.solo_match_predictions smp
    where p_scope in ('overall', 'squad')
    group by smp.user_id

    union all

    select
      usp.user_id,
      count(*)::int as total_predictions,
      coalesce(sum(usp.correct_count), 0)::int as correct_predictions
    from public.user_stage_predictions usp
    where p_scope in ('overall', 'round')
    group by usp.user_id

    union all

    select
      tmp.user_id,
      count(*)::int as total_predictions,
      count(*) filter (where tmp.is_correct)::int as correct_predictions
    from public.team_match_predictions tmp
    where p_scope in ('overall', 'invite')
    group by tmp.user_id
  ),
  prediction_totals as (
    select
      user_id,
      sum(total_predictions)::int as total_predictions,
      sum(correct_predictions)::int as correct_predictions
    from prediction_counts
    group by user_id
  ),
  base_scores as (
    select
      p.id as profile_id,
      coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), nullif(p.email, ''), 'Player') as display_name,
      p.avatar_url,
      coalesce(st.total_points, 0)::int as total_score,
      coalesce(st.total_points, 0)::int as round_score,
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
    left join score_totals st on st.user_id = p.auth_user_id
    left join prediction_totals pc on pc.user_id = p.auth_user_id
    left join invite_counts ic on ic.profile_id = p.id
    where p.role = 'player'
      and coalesce(p.is_blocked, false) = false
  ),
  ranked as (
    select
      *,
      row_number() over (
        order by
          case when p_scope = 'invite' then total_score else total_score end desc,
          invite_count desc,
          created_at asc
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
