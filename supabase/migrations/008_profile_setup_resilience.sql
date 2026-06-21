create or replace function public.generate_referral_code()
returns text
language sql
as $$
  select 'LZP' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
$$;

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
for insert with check (
  auth_user_id = auth.uid()
  and coalesce(user_id, auth_user_id) = auth.uid()
  and role = 'player'
  and is_blocked = false
);

update public.profiles
set nickname = coalesce(nickname, display_name),
    whatsapp_number = coalesce(whatsapp_number, phone),
    display_name = coalesce(display_name, nickname),
    phone = coalesce(phone, whatsapp_number),
    updated_at = now()
where nickname is null
   or whatsapp_number is null
   or display_name is null
   or phone is null;
