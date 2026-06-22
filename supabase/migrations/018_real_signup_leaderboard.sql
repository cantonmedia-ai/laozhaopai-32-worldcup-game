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
      coalesce(nullif(p.nickname, ''), nullif(p.display_name, ''), nullif(p.email, ''), 'Player') as display_name,
      p.avatar_url,
      coalesce(lb.total_score, 0)::int as total_score,
      coalesce(lb.round_score, 0)::int as round_score,
      coalesce(lb.correct_predictions, 0)::int as correct_predictions,
      coalesce(lb.total_predictions, 0)::int as total_predictions,
      coalesce(lb.accuracy_rate, 0) as accuracy_rate,
      lb.previous_rank_position,
      coalesce(ic.invite_count, 0)::int as invite_count,
      p.created_at
    from visible_profiles vp
    join public.profiles p on p.id = vp.id
    cross join selected_game sg
    left join public.leaderboard_scores lb
      on lb.profile_id = p.id
      and (
        sg.game_id is null
        or lb.game_id = sg.game_id
      )
      and (
        (p_scope = 'round' and p_round_id is not null and lb.round_id = p_round_id)
        or (p_scope <> 'round' and lb.round_id is null)
        or (p_scope = 'round' and p_round_id is null)
      )
    left join invite_counts ic on ic.profile_id = p.id
  ),
  ranked as (
    select
      *,
      row_number() over (
        order by
          case
            when p_scope = 'invite' then invite_count
            when p_scope = 'round' then round_score
            else total_score
          end desc,
          total_score desc,
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
