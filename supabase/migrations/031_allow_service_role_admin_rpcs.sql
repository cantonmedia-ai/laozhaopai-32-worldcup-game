create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select
    auth.role() = 'service_role'
    or exists (
      select 1 from public.profiles
      where auth_user_id = auth.uid()
        and role in ('admin', 'owner')
        and is_blocked = false
    )
$$;
