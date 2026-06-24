create or replace function public.generate_referral_code()
returns text
language sql
as $$
  select 'LZP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

alter table public.profiles
add column if not exists user_id uuid,
add column if not exists role text default 'player',
add column if not exists full_name text,
add column if not exists display_name text,
add column if not exists nickname text,
add column if not exists phone text,
add column if not exists phone_number text,
add column if not exists whatsapp_number text,
add column if not exists email text,
add column if not exists avatar_url text,
add column if not exists login_provider text,
add column if not exists provider text,
add column if not exists auth_provider text,
add column if not exists referral_code text,
add column if not exists referred_by_profile_id uuid,
add column if not exists referred_by_user_id uuid,
add column if not exists favorite_team text,
add column if not exists preferred_outlet text,
add column if not exists accept_marketing boolean default false,
add column if not exists profile_completed boolean default false,
add column if not exists email_verified boolean default false,
add column if not exists preferred_language text default 'zh',
add column if not exists display_name_updated_at timestamptz,
add column if not exists is_blocked boolean default false,
add column if not exists created_at timestamptz default now(),
add column if not exists updated_at timestamptz default now();

update public.profiles
set user_id = coalesce(user_id, auth_user_id),
    full_name = coalesce(full_name, display_name, nickname, email, 'Player'),
    provider = coalesce(provider, login_provider, auth_provider, 'email'),
    login_provider = coalesce(login_provider, provider, auth_provider, 'email'),
    auth_provider = coalesce(auth_provider, provider, login_provider, 'email'),
    nickname = coalesce(nickname, display_name),
    whatsapp_number = coalesce(whatsapp_number, phone_number, phone),
    preferred_language = coalesce(preferred_language, 'zh'),
    profile_completed = coalesce(profile_completed, false),
    email_verified = coalesce(email_verified, false),
    referral_code = coalesce(referral_code, public.generate_referral_code()),
    updated_at = now()
where user_id is null
   or provider is null
   or full_name is null
   or login_provider is null
   or auth_provider is null
   or preferred_language is null
   or profile_completed is null
   or email_verified is null
   or referral_code is null;

create unique index if not exists profiles_user_id_idx
on public.profiles(user_id)
where user_id is not null;

create unique index if not exists profiles_referral_code_idx
on public.profiles(referral_code)
where referral_code is not null;

alter table public.profiles
alter column full_name drop not null;
