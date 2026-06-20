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
    jsonb_build_object(
      'team_a_score', p_team_a_score,
      'team_b_score', p_team_b_score,
      'winner_team_id', p_winner_team_id,
      'scoring', jsonb_build_object(
        'winner_points', v_round.scoring_points,
        'one_team_exact_bonus', 5,
        'both_teams_exact_bonus', 15
      )
    ),
    p_reason
  );
end;
$$;
