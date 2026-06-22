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
      select distinct on (profile_id)
        profile_id,
        total_score,
        rank_position
      from public.leaderboard_scores
      order by profile_id, updated_at desc
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
      coalesce(p.display_name, 'Player') as display_name,
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
      stm.member_role desc,
      stm.joined_at asc;
end;
$$;

create or replace function public.complete_player_profile(
  p_nickname text,
  p_whatsapp_number text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles;
  v_provider text;
  v_email text;
  v_avatar_url text;
begin
  if v_user_id is null then
    raise exception 'Please sign in first.';
  end if;

  if nullif(trim(p_nickname), '') is null then
    raise exception 'Please enter your nickname.';
  end if;

  if nullif(trim(p_whatsapp_number), '') is null then
    raise exception 'Please enter your WhatsApp number.';
  end if;

  select
    email,
    coalesce(raw_app_meta_data->>'provider', 'email'),
    raw_user_meta_data->>'avatar_url'
  into v_email, v_provider, v_avatar_url
  from auth.users
  where id = v_user_id;

  insert into public.profiles (
    auth_user_id,
    user_id,
    role,
    email,
    avatar_url,
    login_provider,
    provider,
    auth_provider,
    display_name,
    nickname,
    phone,
    phone_number,
    whatsapp_number,
    profile_completed,
    is_blocked,
    display_name_updated_at,
    referral_code,
    updated_at
  )
  values (
    v_user_id,
    v_user_id,
    'player',
    v_email,
    v_avatar_url,
    v_provider,
    v_provider,
    v_provider,
    trim(p_nickname),
    trim(p_nickname),
    regexp_replace(p_whatsapp_number, '[\s-]', '', 'g'),
    regexp_replace(p_whatsapp_number, '[\s-]', '', 'g'),
    regexp_replace(p_whatsapp_number, '[\s-]', '', 'g'),
    true,
    false,
    now(),
    public.generate_referral_code(),
    now()
  )
  on conflict (auth_user_id) do update set
    user_id = coalesce(public.profiles.user_id, excluded.user_id),
    email = coalesce(public.profiles.email, excluded.email),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    login_provider = coalesce(public.profiles.login_provider, excluded.login_provider),
    provider = coalesce(public.profiles.provider, excluded.provider),
    auth_provider = coalesce(public.profiles.auth_provider, excluded.auth_provider),
    display_name = excluded.display_name,
    nickname = excluded.nickname,
    phone = excluded.phone,
    phone_number = excluded.phone_number,
    whatsapp_number = excluded.whatsapp_number,
    profile_completed = true,
    display_name_updated_at = now(),
    updated_at = now()
  returning * into v_profile;

  perform public.get_or_create_open_squad_team(v_profile.id);

  return v_profile;
end;
$$;

grant execute on function public.get_my_squad() to authenticated;
grant execute on function public.complete_player_profile(text, text) to authenticated;
