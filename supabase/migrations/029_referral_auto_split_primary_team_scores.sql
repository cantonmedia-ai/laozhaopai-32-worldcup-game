alter table public.profiles
add column if not exists primary_team_id uuid references public.squad_teams(id) on delete set null;

create or replace function public.squad_owner_team_name(
  p_owner_profile_id uuid,
  p_team_no int
)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    nullif(trim(p.nickname), ''),
    nullif(trim(p.display_name), ''),
    split_part(coalesce(p.email, 'Player'), '@', 1),
    'Player'
  ) || ' 的第' || p_team_no::text || '队'
  from public.profiles p
  where p.id = p_owner_profile_id
$$;

create or replace function public.get_or_create_open_squad_team(p_owner_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_first_team_id uuid;
  v_next_team_no int;
begin
  select st.id
  into v_first_team_id
  from public.squad_teams st
  where st.owner_profile_id = p_owner_profile_id
    and st.team_no = 1
  limit 1;

  select st.id
  into v_team_id
  from public.squad_teams st
  where st.owner_profile_id = p_owner_profile_id
    and (
      select count(*)
      from public.squad_team_members stm
      where stm.team_id = st.id
    ) < 5
  order by st.team_no
  limit 1;

  if v_team_id is not null then
    insert into public.squad_team_members (team_id, profile_id, member_role)
    values (v_team_id, p_owner_profile_id, 'owner')
    on conflict (team_id, profile_id) do nothing;

    update public.squad_teams st
    set team_name = coalesce(nullif(st.team_name, ''), public.squad_owner_team_name(p_owner_profile_id, st.team_no)),
        updated_at = now()
    where st.id = v_team_id;

    update public.profiles p
    set primary_team_id = coalesce(p.primary_team_id, coalesce(v_first_team_id, v_team_id)),
        updated_at = now()
    where p.id = p_owner_profile_id;

    perform public.update_squad_team_status(v_team_id);
    return v_team_id;
  end if;

  select coalesce(max(st.team_no), 0) + 1
  into v_next_team_no
  from public.squad_teams st
  where st.owner_profile_id = p_owner_profile_id;

  insert into public.squad_teams (owner_profile_id, team_no, team_name)
  values (
    p_owner_profile_id,
    v_next_team_no,
    public.squad_owner_team_name(p_owner_profile_id, v_next_team_no)
  )
  returning id into v_team_id;

  insert into public.squad_team_members (team_id, profile_id, member_role)
  values (v_team_id, p_owner_profile_id, 'owner')
  on conflict (team_id, profile_id) do nothing;

  update public.profiles p
  set primary_team_id = coalesce(p.primary_team_id, coalesce(v_first_team_id, v_team_id)),
      updated_at = now()
  where p.id = p_owner_profile_id;

  perform public.update_squad_team_status(v_team_id);
  return v_team_id;
end;
$$;

create or replace function public.accept_referral(p_referral_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_profile_id uuid := public.current_profile_id();
  v_current_user_id uuid := auth.uid();
  v_referrer_profile_id uuid;
  v_referrer_user_id uuid;
  v_clean_code text := upper(trim(p_referral_code));
  v_team_id uuid;
begin
  if v_current_profile_id is null or v_current_user_id is null then
    raise exception 'Profile not found';
  end if;

  select p.id, p.auth_user_id
  into v_referrer_profile_id, v_referrer_user_id
  from public.profiles p
  where p.referral_code = v_clean_code
    and coalesce(p.is_blocked, false) = false;

  if v_referrer_profile_id is null or v_referrer_profile_id = v_current_profile_id then
    return false;
  end if;

  if exists (
    select 1
    from public.profiles p
    where p.id = v_current_profile_id
      and (p.referred_by_profile_id is not null or p.referred_by_user_id is not null)
  ) or exists (
    select 1
    from public.squad_team_members stm
    join public.squad_teams st on st.id = stm.team_id
    where stm.profile_id = v_current_profile_id
      and stm.member_role = 'member'
      and st.owner_profile_id <> v_current_profile_id
  ) then
    raise exception '你已经加入团队，不能重复加入。';
  end if;

  update public.profiles p
  set referred_by_profile_id = v_referrer_profile_id,
      referred_by_user_id = v_referrer_profile_id,
      updated_at = now()
  where p.id = v_current_profile_id
    and p.referred_by_profile_id is null
    and p.referred_by_user_id is null;

  insert into public.referrals (
    referrer_profile_id,
    referred_profile_id,
    referral_code
  )
  values (
    v_referrer_profile_id,
    v_current_profile_id,
    v_clean_code
  )
  on conflict (referrer_profile_id, referred_profile_id) do nothing;

  v_team_id := public.get_or_create_open_squad_team(v_referrer_profile_id);

  if (
    select count(*)
    from public.squad_team_members stm
    where stm.team_id = v_team_id
  ) >= 5 then
    v_team_id := public.get_or_create_open_squad_team(v_referrer_profile_id);
  end if;

  insert into public.squad_team_members (team_id, profile_id, member_role)
  values (v_team_id, v_current_profile_id, 'member')
  on conflict (team_id, profile_id) do nothing;

  perform public.update_squad_team_status(v_team_id);

  insert into public.point_transactions (
    user_id,
    related_user_id,
    source_type,
    points,
    description
  )
  values (
    v_referrer_user_id,
    v_current_user_id,
    'referral',
    5,
    'Successful referral signup'
  )
  on conflict do nothing;

  perform public.rebuild_final_score_summaries();
  return true;
end;
$$;

create or replace function public.rebuild_final_score_summaries()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.squad_teams st
  set team_name = public.squad_owner_team_name(st.owner_profile_id, st.team_no),
      updated_at = now()
  where st.team_name is null
     or st.team_name = ''
     or st.team_name ~ '^Team [0-9]+$';

  update public.profiles p
  set primary_team_id = first_team.id,
      updated_at = now()
  from (
    select distinct on (st.owner_profile_id)
      st.owner_profile_id,
      st.id
    from public.squad_teams st
    order by st.owner_profile_id, st.team_no asc, st.created_at asc
  ) first_team
  where p.id = first_team.owner_profile_id
    and (p.primary_team_id is null or p.primary_team_id <> first_team.id);

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
  with game1_raw as (
    select
      usp.user_id,
      coalesce(sum(usp.personal_correct_score), 0)::int as game1_individual_score
    from public.user_stage_predictions usp
    where usp.status = 'scored'
    group by usp.user_id
  ),
  game2_raw as (
    select
      smp.user_id,
      coalesce(sum(smp.individual_match_score), 0)::int as game2_individual_score
    from public.solo_match_predictions smp
    where smp.status = 'scored'
    group by smp.user_id
  ),
  personal_raw as (
    select
      p.id as profile_id,
      p.auth_user_id as user_id,
      coalesce(usp.game1_individual_score, 0)::int as game1_individual_score,
      coalesce(smp.game2_individual_score, 0)::int as game2_individual_score
    from public.profiles p
    left join game1_raw usp on usp.user_id = p.auth_user_id
    left join game2_raw smp on smp.user_id = p.auth_user_id
    where p.auth_user_id is not null
    group by p.id, p.auth_user_id, usp.game1_individual_score, smp.game2_individual_score
  ),
  score_team as (
    select
      p.id as profile_id,
      coalesce(
        p.primary_team_id,
        owner_first_team.id,
        member_team.team_id
      ) as team_id
    from public.profiles p
    left join lateral (
      select st.id
      from public.squad_teams st
      where st.owner_profile_id = p.id
      order by st.team_no asc, st.created_at asc
      limit 1
    ) owner_first_team on true
    left join lateral (
      select stm.team_id
      from public.squad_team_members stm
      join public.squad_teams st on st.id = stm.team_id
      where stm.profile_id = p.id
        and stm.member_role = 'member'
        and st.owner_profile_id <> p.id
      order by stm.joined_at asc
      limit 1
    ) member_team on owner_first_team.id is null
  )
  select
    pr.profile_id,
    pr.user_id,
    pr.game1_individual_score,
    coalesce(stss.team_game1_accumulated_score, 0),
    pr.game1_individual_score + coalesce(stss.team_game1_accumulated_score, 0),
    pr.game2_individual_score,
    coalesce(stss.team_game2_accumulated_score, 0),
    pr.game2_individual_score + coalesce(stss.team_game2_accumulated_score, 0),
    pr.game1_individual_score + pr.game2_individual_score
      + coalesce(stss.team_game1_accumulated_score, 0)
      + coalesce(stss.team_game2_accumulated_score, 0),
    now()
  from personal_raw pr
  left join score_team st on st.profile_id = pr.profile_id
  left join public.squad_team_score_summaries stss on stss.team_id = st.team_id
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
end;
$$;

select public.rebuild_final_score_summaries();

grant execute on function public.get_or_create_open_squad_team(uuid) to authenticated;
grant execute on function public.accept_referral(text) to authenticated;
grant execute on function public.rebuild_final_score_summaries() to authenticated;
