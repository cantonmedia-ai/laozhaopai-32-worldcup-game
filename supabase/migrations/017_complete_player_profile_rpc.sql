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

  return v_profile;
end;
$$;

grant execute on function public.complete_player_profile(text, text) to authenticated;
