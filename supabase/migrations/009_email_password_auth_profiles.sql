alter table public.profiles
add column if not exists phone_number text,
add column if not exists auth_provider text;

update public.profiles
set phone_number = coalesce(phone_number, whatsapp_number, phone),
    auth_provider = coalesce(auth_provider, provider, login_provider),
    updated_at = now()
where phone_number is null
   or auth_provider is null;

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

  return new;
end;
$$;
