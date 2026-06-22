alter table public.point_transactions
add column if not exists related_user_id uuid references auth.users(id) on delete set null;

create unique index if not exists point_transactions_early_signup_once_idx
on public.point_transactions(user_id, source_type)
where source_type = 'early_signup';

create unique index if not exists point_transactions_referral_once_idx
on public.point_transactions(user_id, source_type, related_user_id)
where source_type = 'referral' and related_user_id is not null;

insert into public.point_transactions (
  user_id,
  source_type,
  points,
  description
)
select
  p.auth_user_id,
  'early_signup',
  10,
  'Early signup bonus'
from public.profiles p
where p.auth_user_id is not null
on conflict do nothing;

insert into public.point_transactions (
  user_id,
  related_user_id,
  source_type,
  points,
  description
)
select
  referrer.auth_user_id,
  referred.auth_user_id,
  'referral',
  5,
  'Successful referral signup'
from public.referrals r
join public.profiles referrer on referrer.id = r.referrer_profile_id
join public.profiles referred on referred.id = r.referred_profile_id
where referrer.auth_user_id is not null
  and referred.auth_user_id is not null
on conflict do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    auth_user_id,
    user_id,
    email,
    avatar_url,
    login_provider,
    provider,
    auth_provider,
    role,
    profile_completed,
    referral_code
  )
  values (
    new.id,
    new.id,
    new.email,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.app_metadata->>'provider', 'email'),
    coalesce(new.app_metadata->>'provider', 'email'),
    coalesce(new.app_metadata->>'provider', 'email'),
    'player',
    false,
    public.generate_referral_code()
  )
  on conflict (auth_user_id) do update set
    user_id = coalesce(public.profiles.user_id, excluded.user_id),
    email = coalesce(public.profiles.email, excluded.email),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    login_provider = coalesce(public.profiles.login_provider, excluded.login_provider),
    provider = coalesce(public.profiles.provider, excluded.provider),
    auth_provider = coalesce(public.profiles.auth_provider, excluded.auth_provider),
    updated_at = now();

  insert into public.point_transactions (
    user_id,
    source_type,
    points,
    description
  )
  values (
    new.id,
    'early_signup',
    10,
    'Early signup bonus'
  )
  on conflict do nothing;

  return new;
exception
  when others then
    raise warning 'handle_new_user skipped profile/bonus creation for auth user %: %', new.id, sqlerrm;
    return new;
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
begin
  if v_current_profile_id is null or v_current_user_id is null then
    raise exception 'Profile not found';
  end if;

  select id, auth_user_id
  into v_referrer_profile_id, v_referrer_user_id
  from public.profiles
  where referral_code = v_clean_code
    and is_blocked = false;

  if v_referrer_profile_id is null or v_referrer_profile_id = v_current_profile_id then
    return false;
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_current_profile_id
      and (referred_by_profile_id is not null or referred_by_user_id is not null)
  ) then
    return false;
  end if;

  update public.profiles
  set referred_by_profile_id = v_referrer_profile_id,
      referred_by_user_id = v_referrer_profile_id,
      updated_at = now()
  where id = v_current_profile_id
    and referred_by_profile_id is null
    and referred_by_user_id is null;

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

grant execute on function public.accept_referral(text) to authenticated;
