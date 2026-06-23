create table if not exists public.player_score_summaries (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete cascade,
  game1_individual_score int not null default 0,
  game1_team_accumulated_score int not null default 0,
  game1_final_earned_score int not null default 0,
  game2_individual_score int not null default 0,
  game2_team_accumulated_score int not null default 0,
  game2_final_earned_score int not null default 0,
  individual_final_score int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.squad_team_score_summaries (
  team_id uuid primary key references public.squad_teams(id) on delete cascade,
  team_game1_accumulated_score int not null default 0,
  team_game2_accumulated_score int not null default 0,
  team_final_score int not null default 0,
  member_count int not null default 0,
  ranking_position int,
  updated_at timestamptz not null default now()
);

alter table public.player_score_summaries enable row level security;
alter table public.squad_team_score_summaries enable row level security;

drop policy if exists "player score summaries read" on public.player_score_summaries;
create policy "player score summaries read" on public.player_score_summaries
for select using (
  user_id = auth.uid()
  or public.is_admin()
  or true
);

drop policy if exists "squad team score summaries read" on public.squad_team_score_summaries;
create policy "squad team score summaries read" on public.squad_team_score_summaries
for select using (true);

create or replace function public.rebuild_final_score_summaries()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.player_score_summaries (
    profile_id,
    user_id,
    game1_individual_score,
    game1_team_accumulated_score,
    game1_final_earned_score,
    game2_individual_score,
    game2_team_accumulated_score,
    game2_final_earned_score,
    individual_final_score,
    updated_at
  )
  with game1_scores as (
    select
      usp.user_id,
      coalesce(sum(usp.personal_correct_score), 0)::int as game1_individual_score,
      coalesce(sum(usp.team_accumulated_score), 0)::int as game1_team_accumulated_score,
      coalesce(sum(usp.final_earned_score), 0)::int as game1_final_earned_score
    from public.user_stage_predictions usp
    where usp.status = 'scored'
    group by usp.user_id
  ),
  game2_scores as (
    select
      smp.user_id,
      coalesce(sum(smp.individual_match_score), 0)::int as game2_individual_score,
      coalesce(sum(smp.team_accumulated_score), 0)::int as game2_team_accumulated_score,
      coalesce(sum(smp.final_earned_score), 0)::int as game2_final_earned_score
    from public.solo_match_predictions smp
    where smp.status = 'scored'
    group by smp.user_id
  )
  select
    p.id,
    p.auth_user_id,
    coalesce(g1.game1_individual_score, 0),
    coalesce(g1.game1_team_accumulated_score, 0),
    coalesce(g1.game1_final_earned_score, 0),
    coalesce(g2.game2_individual_score, 0),
    coalesce(g2.game2_team_accumulated_score, 0),
    coalesce(g2.game2_final_earned_score, 0),
    coalesce(g1.game1_final_earned_score, 0) + coalesce(g2.game2_final_earned_score, 0),
    now()
  from public.profiles p
  left join game1_scores g1 on g1.user_id = p.auth_user_id
  left join game2_scores g2 on g2.user_id = p.auth_user_id
  where p.auth_user_id is not null
  on conflict (profile_id) do update set
    user_id = excluded.user_id,
    game1_individual_score = excluded.game1_individual_score,
    game1_team_accumulated_score = excluded.game1_team_accumulated_score,
    game1_final_earned_score = excluded.game1_final_earned_score,
    game2_individual_score = excluded.game2_individual_score,
    game2_team_accumulated_score = excluded.game2_team_accumulated_score,
    game2_final_earned_score = excluded.game2_final_earned_score,
    individual_final_score = excluded.individual_final_score,
    updated_at = now();

  insert into public.squad_team_score_summaries (
    team_id,
    team_game1_accumulated_score,
    team_game2_accumulated_score,
    team_final_score,
    member_count,
    ranking_position,
    updated_at
  )
  with team_members as (
    select
      st.id as team_id,
      stm.profile_id,
      p.auth_user_id
    from public.squad_teams st
    join public.squad_team_members stm on stm.team_id = st.id
    join public.profiles p on p.id = stm.profile_id
    where p.auth_user_id is not null
  ),
  member_counts as (
    select team_id, count(*)::int as member_count
    from team_members
    group by team_id
  ),
  team_game1 as (
    select
      tm.team_id,
      coalesce(sum(usp.personal_correct_score), 0)::int as team_game1_score
    from team_members tm
    left join public.user_stage_predictions usp
      on usp.user_id = tm.auth_user_id
      and usp.status = 'scored'
    group by tm.team_id
  ),
  team_game2 as (
    select
      tm.team_id,
      coalesce(sum(smp.individual_match_score), 0)::int as team_game2_score
    from team_members tm
    left join public.solo_match_predictions smp
      on smp.user_id = tm.auth_user_id
      and smp.status = 'scored'
    group by tm.team_id
  ),
  base as (
    select
      mc.team_id,
      case when mc.member_count >= 2 then coalesce(tg1.team_game1_score, 0) else 0 end as team_game1_score,
      case when mc.member_count >= 2 then coalesce(tg2.team_game2_score, 0) else 0 end as team_game2_score,
      mc.member_count
    from member_counts mc
    left join team_game1 tg1 on tg1.team_id = mc.team_id
    left join team_game2 tg2 on tg2.team_id = mc.team_id
  ),
  ranked as (
    select
      *,
      case
        when member_count >= 2 then row_number() over (
          order by (team_game1_score + team_game2_score) desc, member_count desc, team_id
        )::int
        else null::int
      end as ranking_position
    from base
  )
  select
    team_id,
    team_game1_score,
    team_game2_score,
    team_game1_score + team_game2_score,
    member_count,
    ranking_position,
    now()
  from ranked
  on conflict (team_id) do update set
    team_game1_accumulated_score = excluded.team_game1_accumulated_score,
    team_game2_accumulated_score = excluded.team_game2_accumulated_score,
    team_final_score = excluded.team_final_score,
    member_count = excluded.member_count,
    ranking_position = excluded.ranking_position,
    updated_at = now();
end;
$$;

create or replace function public.refresh_final_score_summaries_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.rebuild_final_score_summaries();
  return null;
end;
$$;

drop trigger if exists refresh_final_scores_user_stage_predictions on public.user_stage_predictions;
create trigger refresh_final_scores_user_stage_predictions
after insert or update or delete on public.user_stage_predictions
for each statement execute function public.refresh_final_score_summaries_trigger();

drop trigger if exists refresh_final_scores_solo_match_predictions on public.solo_match_predictions;
create trigger refresh_final_scores_solo_match_predictions
after insert or update or delete on public.solo_match_predictions
for each statement execute function public.refresh_final_score_summaries_trigger();

drop trigger if exists refresh_final_scores_squad_team_members on public.squad_team_members;
create trigger refresh_final_scores_squad_team_members
after insert or update or delete on public.squad_team_members
for each statement execute function public.refresh_final_score_summaries_trigger();

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

select public.rebuild_final_score_summaries();

grant execute on function public.rebuild_final_score_summaries() to authenticated;
grant execute on function public.get_leaderboard(uuid, uuid, text) to anon, authenticated;
