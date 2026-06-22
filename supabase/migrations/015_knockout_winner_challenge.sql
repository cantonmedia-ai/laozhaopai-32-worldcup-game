update public.game_rounds
set scoring_points = case
    when round_order = 1 then 5
    when round_order = 2 then 8
    when round_order = 3 then 12
    when round_order = 4 then 18
    when round_order = 5 then 30
    else scoring_points
  end,
  round_name = case
    when round_order = 1 then 'Last 32'
    when round_order = 2 then 'Last 16'
    when round_order = 3 then 'Last 8'
    when round_order = 4 then 'Last 4'
    when round_order = 5 then 'Final'
    else round_name
  end,
  updated_at = now()
where round_order between 1 and 5;

update public.games
set name = '淘汰赛赢家战 / Knockout Winner Challenge',
    description = '预测每一轮淘汰赛赢家，个人积分冲排行榜。',
    updated_at = now()
where status = 'active';

create unique index if not exists score_history_profile_match_reason_idx
on public.score_history(profile_id, match_id, reason)
where match_id is not null;

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

  if v_match.id is null then
    raise exception 'Match not found';
  end if;

  if v_match.status = 'completed'
     and exists (
       select 1
       from public.predictions
       where match_id = p_match_id
         and calculated_at is not null
     ) then
    raise exception 'This match has already been scored.';
  end if;

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
        case
          when predicted_winner_team_id = p_winner_team_id then v_round.scoring_points
          else 0
        end,
      calculated_at = now()
  where match_id = p_match_id
    and calculated_at is null;

  insert into public.score_history (
    profile_id,
    game_id,
    round_id,
    match_id,
    points_awarded,
    reason
  )
  select
    profile_id,
    game_id,
    round_id,
    match_id,
    score_awarded,
    'Knockout Winner Challenge'
  from public.predictions
  where match_id = p_match_id
    and calculated_at is not null
  on conflict do nothing;

  perform public.rebuild_leaderboards(v_match.game_id);

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
    'confirm_knockout_winner_result',
    'matches',
    p_match_id,
    jsonb_build_object(
      'game', 'Knockout Winner Challenge',
      'team_a_score', p_team_a_score,
      'team_b_score', p_team_b_score,
      'winner_team_id', p_winner_team_id,
      'winner_points', v_round.scoring_points
    ),
    coalesce(p_reason, 'Knockout Winner Challenge result confirmed')
  );
end;
$$;

grant execute on function public.confirm_match_result(uuid, int, int, uuid, text) to authenticated;
