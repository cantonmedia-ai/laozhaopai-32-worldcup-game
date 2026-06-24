-- Align Game 2 scoring with the published rule: winner +2, score accuracy +0/+1/+3, max 5 per match.
-- Some environments do not have Game 2 knockout tables yet, so this migration is a safe no-op until they exist.
do $migration$
begin
  if to_regclass('public.knockout_matches') is not null then
    execute $safe$
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

  v_winner_points := 2;

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
    grant execute on function public.admin_confirm_knockout_match_result(uuid, uuid, int, int) to authenticated;
$safe$;
  end if;
end;
$migration$;
