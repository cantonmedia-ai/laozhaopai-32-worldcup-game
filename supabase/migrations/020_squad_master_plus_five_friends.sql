create or replace function public.update_squad_team_status(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_friend_members int;
  v_next_status text;
begin
  select count(*) filter (where member_role = 'member')::int
  into v_friend_members
  from public.squad_team_members
  where team_id = p_team_id;

  v_next_status :=
    case
      when v_friend_members >= 5 then 'full'
      when v_friend_members >= 2 then 'active'
      else 'forming'
    end;

  update public.squad_teams
  set status = v_next_status,
      updated_at = now()
  where id = p_team_id;
end;
$$;

create or replace function public.get_or_create_open_squad_team(p_owner_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_team_id uuid;
  v_next_team_no int;
begin
  select st.id into v_team_id
  from public.squad_teams st
  where st.owner_profile_id = p_owner_profile_id
    and (
      select count(*)
      from public.squad_team_members stm
      where stm.team_id = st.id
        and stm.member_role = 'member'
    ) < 5
  order by st.team_no
  limit 1;

  if v_team_id is not null then
    insert into public.squad_team_members (team_id, profile_id, member_role)
    values (v_team_id, p_owner_profile_id, 'owner')
    on conflict (team_id, profile_id) do nothing;

    perform public.update_squad_team_status(v_team_id);
    return v_team_id;
  end if;

  select coalesce(max(team_no), 0) + 1
  into v_next_team_no
  from public.squad_teams
  where owner_profile_id = p_owner_profile_id;

  insert into public.squad_teams (owner_profile_id, team_no, team_name)
  values (p_owner_profile_id, v_next_team_no, 'Team ' || v_next_team_no)
  returning id into v_team_id;

  insert into public.squad_team_members (team_id, profile_id, member_role)
  values (v_team_id, p_owner_profile_id, 'owner')
  on conflict (team_id, profile_id) do nothing;

  perform public.update_squad_team_status(v_team_id);

  return v_team_id;
end;
$$;

do $$
declare
  v_team record;
begin
  for v_team in select id from public.squad_teams loop
    perform public.update_squad_team_status(v_team.id);
  end loop;
end;
$$;

grant execute on function public.update_squad_team_status(uuid) to authenticated;
grant execute on function public.get_or_create_open_squad_team(uuid) to authenticated;
