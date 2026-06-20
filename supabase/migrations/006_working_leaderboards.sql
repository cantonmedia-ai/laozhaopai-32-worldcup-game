create or replace function public.rebuild_leaderboards(p_game_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.leaderboard_scores
  where game_id = p_game_id;

  insert into public.leaderboard_scores (
    profile_id,
    game_id,
    round_id,
    round_score,
    total_score,
    correct_predictions,
    total_predictions,
    accuracy_rate,
    rank_position,
    previous_rank_position,
    updated_at
  )
  with profile_totals as (
    select
      p.id as profile_id,
      p.created_at,
      coalesce(sum(pr.score_awarded), 0)::int as total_score,
      coalesce(count(*) filter (where pr.is_correct = true), 0)::int as correct_predictions,
      coalesce(count(pr.id), 0)::int as total_predictions,
      case
        when count(pr.id) = 0 then 0
        else round((count(*) filter (where pr.is_correct = true)::numeric / count(pr.id)::numeric) * 100, 2)
      end as accuracy_rate
    from public.profiles p
    left join public.predictions pr
      on pr.profile_id = p.id
      and pr.game_id = p_game_id
      and pr.calculated_at is not null
    where p.role = 'player'
      and p.is_blocked = false
    group by p.id, p.created_at
  ),
  ranked as (
    select
      *,
      row_number() over (
        order by total_score desc, accuracy_rate desc, correct_predictions desc, created_at asc
      )::int as rank_position
    from profile_totals
  )
  select
    profile_id,
    p_game_id,
    null::uuid as round_id,
    0 as round_score,
    total_score,
    correct_predictions,
    total_predictions,
    accuracy_rate,
    rank_position,
    null::int as previous_rank_position,
    now()
  from ranked;

  insert into public.leaderboard_scores (
    profile_id,
    game_id,
    round_id,
    round_score,
    total_score,
    correct_predictions,
    total_predictions,
    accuracy_rate,
    rank_position,
    previous_rank_position,
    updated_at
  )
  with round_totals as (
    select
      p.id as profile_id,
      p.created_at,
      pr.round_id,
      coalesce(sum(pr.score_awarded), 0)::int as round_score,
      coalesce(count(*) filter (where pr.is_correct = true), 0)::int as correct_predictions,
      coalesce(count(pr.id), 0)::int as total_predictions,
      case
        when count(pr.id) = 0 then 0
        else round((count(*) filter (where pr.is_correct = true)::numeric / count(pr.id)::numeric) * 100, 2)
      end as accuracy_rate
    from public.profiles p
    join public.predictions pr
      on pr.profile_id = p.id
      and pr.game_id = p_game_id
      and pr.calculated_at is not null
    where p.role = 'player'
      and p.is_blocked = false
    group by p.id, p.created_at, pr.round_id
  ),
  ranked as (
    select
      *,
      row_number() over (
        partition by round_id
        order by round_score desc, accuracy_rate desc, correct_predictions desc, created_at asc
      )::int as rank_position
    from round_totals
  )
  select
    profile_id,
    p_game_id,
    round_id,
    round_score,
    round_score as total_score,
    correct_predictions,
    total_predictions,
    accuracy_rate,
    rank_position,
    null::int as previous_rank_position,
    now()
  from ranked
  on conflict (profile_id, game_id, round_id) do update set
    round_score = excluded.round_score,
    total_score = excluded.total_score,
    correct_predictions = excluded.correct_predictions,
    total_predictions = excluded.total_predictions,
    accuracy_rate = excluded.accuracy_rate,
    previous_rank_position = leaderboard_scores.rank_position,
    rank_position = excluded.rank_position,
    updated_at = now();
end;
$$;

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
  with selected_game as (
    select coalesce(
      p_game_id,
      (select id from public.games where status = 'active' order by created_at desc limit 1)
    ) as game_id
  ),
  me as (
    select id from public.profiles where auth_user_id = auth.uid()
  ),
  invite_counts as (
    select referrer_profile_id as profile_id, count(*)::int as invite_count
    from public.referrals
    group by referrer_profile_id
  ),
  visible_profiles as (
    select p.id
    from public.profiles p
    where p.role = 'player'
      and p.is_blocked = false
      and (
        p_scope in ('overall', 'round', 'invite')
        or p.id = (select id from me)
        or exists (
          select 1 from public.referrals r
          where (r.referrer_profile_id = (select id from me) and r.referred_profile_id = p.id)
             or (r.referred_profile_id = (select id from me) and r.referrer_profile_id = p.id)
        )
        or exists (
          select 1
          from public.squad_team_members mine
          join public.squad_team_members mate on mate.team_id = mine.team_id
          where mine.profile_id = (select id from me)
            and mate.profile_id = p.id
        )
      )
  ),
  base_scores as (
    select
      p.id as profile_id,
      coalesce(p.display_name, '未设置昵称') as display_name,
      p.avatar_url,
      coalesce(lb.total_score, 0) as total_score,
      coalesce(lb.round_score, 0) as round_score,
      coalesce(lb.correct_predictions, 0) as correct_predictions,
      coalesce(lb.total_predictions, 0) as total_predictions,
      coalesce(lb.accuracy_rate, 0) as accuracy_rate,
      lb.rank_position,
      lb.previous_rank_position,
      coalesce(ic.invite_count, 0) as invite_count,
      p.created_at
    from visible_profiles vp
    join public.profiles p on p.id = vp.id
    cross join selected_game sg
    left join public.leaderboard_scores lb
      on lb.profile_id = p.id
      and lb.game_id = sg.game_id
      and (
        (p_scope = 'round' and lb.round_id = p_round_id)
        or (p_scope <> 'round' and lb.round_id is null)
      )
    left join invite_counts ic on ic.profile_id = p.id
  ),
  ranked_invites as (
    select
      *,
      row_number() over (
        order by invite_count desc, total_score desc, created_at asc
      )::int as invite_rank
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
    case when p_scope = 'invite' then invite_rank else coalesce(rank_position, 999999) end as rank_position,
    previous_rank_position,
    invite_count
  from ranked_invites
  order by
    case when p_scope = 'invite' then invite_rank else coalesce(rank_position, 999999) end,
    total_score desc,
    created_at asc
  limit 100;
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

  perform public.rebuild_leaderboards(v_match.game_id);

  insert into public.admin_audit_logs (admin_profile_id, action_type, target_table, target_id, new_value, reason)
  values (
    v_admin_profile_id,
    'confirm_match_result',
    'matches',
    p_match_id,
    jsonb_build_object(
      'team_a_score', p_team_a_score,
      'team_b_score', p_team_b_score,
      'winner_team_id', p_winner_team_id
    ),
    p_reason
  );
end;
$$;

grant execute on function public.rebuild_leaderboards(uuid) to authenticated;
grant execute on function public.get_leaderboard(uuid, uuid, text) to authenticated;
