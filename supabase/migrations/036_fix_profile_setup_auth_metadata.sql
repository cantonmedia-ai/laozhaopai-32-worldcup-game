create or replace function public.complete_player_profile(
  p_nickname text,
  p_whatsapp_number text default null,
  p_preferred_language text default 'zh'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_profile public.profiles;
  v_clean_name text := nullif(trim(p_nickname), '');
  v_clean_whatsapp text := nullif(regexp_replace(coalesce(p_whatsapp_number, ''), '[\s-]', '', 'g'), '');
  v_language text := case when p_preferred_language = 'en' then 'en' else 'zh' end;
  v_provider text;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first.';
  end if;

  if v_clean_name is null then
    raise exception 'Please enter your display name.';
  end if;

  if length(v_clean_name) < 2 or length(v_clean_name) > 30 then
    raise exception 'Display name must be 2 to 30 characters.';
  end if;

  if v_clean_whatsapp is not null and v_clean_whatsapp !~ '^(\+?60[0-9]{8,10}|0[0-9]{8,10})$' then
    raise exception 'Enter a valid mobile number.';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  v_provider := coalesce(v_user.raw_app_meta_data->>'provider', 'email');

  insert into public.profiles (
    auth_user_id,
    user_id,
    email,
    avatar_url,
    login_provider,
    provider,
    auth_provider,
    role,
    display_name,
    nickname,
    whatsapp_number,
    phone_number,
    phone,
    preferred_language,
    profile_completed,
    email_verified,
    referral_code,
    created_at,
    updated_at
  )
  values (
    v_user.id,
    v_user.id,
    v_user.email,
    v_user.raw_user_meta_data->>'avatar_url',
    v_provider,
    v_provider,
    v_provider,
    'player',
    v_clean_name,
    v_clean_name,
    v_clean_whatsapp,
    v_clean_whatsapp,
    v_clean_whatsapp,
    v_language,
    true,
    case when v_provider = 'google' then true else coalesce(v_user.email_confirmed_at is not null, false) end,
    public.generate_referral_code(),
    now(),
    now()
  )
  on conflict (auth_user_id) do update set
    user_id = coalesce(public.profiles.user_id, excluded.user_id),
    email = coalesce(public.profiles.email, excluded.email),
    avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
    login_provider = excluded.login_provider,
    provider = excluded.provider,
    auth_provider = excluded.auth_provider,
    display_name = excluded.display_name,
    nickname = excluded.nickname,
    whatsapp_number = excluded.whatsapp_number,
    phone_number = excluded.phone_number,
    phone = excluded.phone,
    preferred_language = excluded.preferred_language,
    profile_completed = true,
    email_verified = case
      when excluded.auth_provider = 'google' then true
      else public.profiles.email_verified
    end,
    updated_at = now()
  returning * into v_profile;

  perform public.get_or_create_open_squad_team(v_profile.id);

  return v_profile;
end;
$$;

grant execute on function public.complete_player_profile(text, text, text) to authenticated;
