create or replace function public.ensure_profile_referral_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_referral_code text;
begin
  if v_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select p.referral_code
  into v_referral_code
  from public.profiles p
  where p.id = v_profile_id;

  if nullif(trim(v_referral_code), '') is null then
    v_referral_code := public.generate_referral_code();

    update public.profiles p
    set referral_code = v_referral_code,
        updated_at = now()
    where p.id = v_profile_id
      and nullif(trim(p.referral_code), '') is null;

    select p.referral_code
    into v_referral_code
    from public.profiles p
    where p.id = v_profile_id;
  end if;

  return v_referral_code;
end;
$$;

create or replace function public.update_squad_team_status(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_friend_members int;
  v_next_status text;
begin
  select count(*) filter (where stm.member_role = 'member')::int
  into v_friend_members
  from public.squad_team_members stm
  where stm.team_id = p_team_id;

  v_next_status :=
    case
      when v_friend_members >= 4 then 'full'
      when v_friend_members >= 2 then 'active'
      else 'forming'
    end;

  update public.squad_teams st
  set status = v_next_status,
      updated_at = now()
  where st.id = p_team_id;
end;
$$;

create or replace function public.get_or_create_open_squad_team(p_owner_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_next_team_no int;
begin
  select st.id
  into v_team_id
  from public.squad_teams st
  where st.owner_profile_id = p_owner_profile_id
    and (
      select count(*)
      from public.squad_team_members stm
      where stm.team_id = st.id
        and stm.member_role = 'member'
    ) < 4
  order by st.team_no
  limit 1;

  if v_team_id is not null then
    insert into public.squad_team_members (team_id, profile_id, member_role)
    values (v_team_id, p_owner_profile_id, 'owner')
    on conflict (team_id, profile_id) do nothing;

    perform public.update_squad_team_status(v_team_id);
    return v_team_id;
  end if;

  select coalesce(max(st.team_no), 0) + 1
  into v_next_team_no
  from public.squad_teams st
  where st.owner_profile_id = p_owner_profile_id;

  insert into public.squad_teams (owner_profile_id, team_no, team_name)
  values (p_owner_profile_id, v_next_team_no, 'Team ' || v_next_team_no)
  returning id into v_team_id;

  insert into public.squad_team_members (team_id, profile_id, member_role)
  values (v_team_id, p_owner_profile_id, 'owner')
  on conflict (team_id, profile_id) do nothing;

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
    where stm.profile_id = v_current_profile_id
      and stm.member_role = 'member'
  ) then
    return false;
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

  return true;
end;
$$;

create or replace function public.get_my_squad()
returns table (
  relationship text,
  team_id uuid,
  team_no int,
  team_name text,
  team_status text,
  team_member_count int,
  team_friend_count int,
  owner_profile_id uuid,
  profile_id uuid,
  display_name text,
  avatar_url text,
  referral_code text,
  total_score int,
  rank_position int,
  joined_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_profile_id uuid := public.current_profile_id();
begin
  if v_current_profile_id is null then
    return;
  end if;

  perform public.ensure_profile_referral_code();
  perform public.get_or_create_open_squad_team(v_current_profile_id);

  return query
    with visible_teams as (
      select st.*
      from public.squad_teams st
      where st.owner_profile_id = v_current_profile_id

      union

      select st.*
      from public.squad_team_members stm
      join public.squad_teams st on st.id = stm.team_id
      where stm.profile_id = v_current_profile_id
    ),
    team_counts as (
      select
        stm.team_id,
        count(*)::int as team_member_count,
        count(*) filter (where stm.member_role = 'member')::int as team_friend_count
      from public.squad_team_members stm
      group by stm.team_id
    ),
    latest_scores as (
      select distinct on (lbs.profile_id)
        lbs.profile_id,
        lbs.total_score,
        lbs.rank_position
      from public.leaderboard_scores lbs
      order by lbs.profile_id, lbs.updated_at desc
    )
    select
      case
        when vt.owner_profile_id = v_current_profile_id and stm.member_role = 'owner' then 'my_team_owner'
        when vt.owner_profile_id = v_current_profile_id then 'invited_by_me'
        when stm.profile_id = v_current_profile_id then 'team_i_joined'
        else 'same_team_member'
      end as relationship,
      vt.id as team_id,
      vt.team_no,
      coalesce(vt.team_name, 'Team ' || vt.team_no) as team_name,
      vt.status as team_status,
      coalesce(tc.team_member_count, 0) as team_member_count,
      coalesce(tc.team_friend_count, 0) as team_friend_count,
      vt.owner_profile_id,
      p.id as profile_id,
      coalesce(p.display_name, p.nickname, 'Player') as display_name,
      p.avatar_url,
      p.referral_code,
      coalesce(ls.total_score, 0) as total_score,
      ls.rank_position,
      stm.joined_at
    from visible_teams vt
    join public.squad_team_members stm on stm.team_id = vt.id
    join public.profiles p on p.id = stm.profile_id
    left join team_counts tc on tc.team_id = vt.id
    left join latest_scores ls on ls.profile_id = p.id
    order by
      (vt.owner_profile_id = v_current_profile_id) desc,
      vt.team_no,
      (stm.member_role = 'owner') desc,
      stm.joined_at asc;
end;
$$;

do $$
declare
  v_team record;
begin
  for v_team in select st.id from public.squad_teams st loop
    perform public.update_squad_team_status(v_team.id);
  end loop;
end;
$$;

grant execute on function public.ensure_profile_referral_code() to authenticated;
grant execute on function public.update_squad_team_status(uuid) to authenticated;
grant execute on function public.get_or_create_open_squad_team(uuid) to authenticated;
grant execute on function public.accept_referral(text) to authenticated;
grant execute on function public.get_my_squad() to authenticated;
