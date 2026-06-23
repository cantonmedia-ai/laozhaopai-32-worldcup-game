create extension if not exists pgcrypto with schema extensions;

create or replace function public.gen_salt(p_type text)
returns text
language sql
stable
set search_path = extensions
as $$
  select extensions.gen_salt(p_type);
$$;

create or replace function public.crypt(p_password text, p_salt text)
returns text
language sql
stable
set search_path = extensions
as $$
  select extensions.crypt(p_password, p_salt);
$$;
