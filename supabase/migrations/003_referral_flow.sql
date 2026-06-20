create or replace function public.accept_referral(p_referral_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_profile_id uuid := public.current_profile_id();
  v_referrer_profile_id uuid;
  v_clean_code text := upper(trim(p_referral_code));
begin
  if v_current_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select id into v_referrer_profile_id
  from public.profiles
  where referral_code = v_clean_code
    and is_blocked = false;

  if v_referrer_profile_id is null then
    return false;
  end if;

  if v_referrer_profile_id = v_current_profile_id then
    return false;
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_current_profile_id
      and referred_by_profile_id is not null
  ) then
    return false;
  end if;

  update public.profiles
  set referred_by_profile_id = v_referrer_profile_id,
      updated_at = now()
  where id = v_current_profile_id
    and referred_by_profile_id is null;

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

  return true;
end;
$$;

create or replace function public.get_my_squad()
returns table (
  relationship text,
  profile_id uuid,
  display_name text,
  avatar_url text,
  referral_code text,
  total_score int,
  rank_position int,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select id
    from public.profiles
    where auth_user_id = auth.uid()
  ),
  squad_profiles as (
    select
      'me'::text as relationship,
      p.id as profile_id,
      p.display_name,
      p.avatar_url,
      p.referral_code,
      p.created_at as joined_at
    from public.profiles p
    join me on p.id = me.id

    union all

    select
      'invited_by_me'::text as relationship,
      p.id as profile_id,
      p.display_name,
      p.avatar_url,
      p.referral_code,
      r.created_at as joined_at
    from public.referrals r
    join me on r.referrer_profile_id = me.id
    join public.profiles p on p.id = r.referred_profile_id

    union all

    select
      'invited_me'::text as relationship,
      p.id as profile_id,
      p.display_name,
      p.avatar_url,
      p.referral_code,
      r.created_at as joined_at
    from public.referrals r
    join me on r.referred_profile_id = me.id
    join public.profiles p on p.id = r.referrer_profile_id
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
    sp.relationship,
    sp.profile_id,
    coalesce(sp.display_name, '未设置昵称') as display_name,
    sp.avatar_url,
    sp.referral_code,
    coalesce(ls.total_score, 0) as total_score,
    ls.rank_position,
    sp.joined_at
  from squad_profiles sp
  left join latest_scores ls on ls.profile_id = sp.profile_id
  order by
    case sp.relationship
      when 'me' then 0
      when 'invited_me' then 1
      else 2
    end,
    total_score desc,
    joined_at asc;
$$;

grant execute on function public.accept_referral(text) to authenticated;
grant execute on function public.get_my_squad() to authenticated;
