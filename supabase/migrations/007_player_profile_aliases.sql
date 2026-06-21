alter table public.profiles
add column if not exists user_id uuid,
add column if not exists provider text,
add column if not exists nickname text,
add column if not exists whatsapp_number text;

update public.profiles
set user_id = coalesce(user_id, auth_user_id),
    provider = coalesce(provider, login_provider),
    nickname = coalesce(nickname, display_name),
    whatsapp_number = coalesce(whatsapp_number, phone)
where user_id is null
   or provider is null
   or nickname is null
   or whatsapp_number is null;

create unique index if not exists profiles_user_id_idx
on public.profiles(user_id)
where user_id is not null;
