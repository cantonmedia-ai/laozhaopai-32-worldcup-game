alter table public.squad_teams
add column if not exists team_name text;

update public.squad_teams
set team_name = 'Team ' || team_no
where team_name is null;

create or replace function public.rename_squad_team(
  p_team_id uuid,
  p_team_name text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_profile_id uuid := public.current_profile_id();
  v_clean_name text := trim(p_team_name);
begin
  if v_current_profile_id is null then
    raise exception 'Profile not found';
  end if;

  if length(v_clean_name) < 2 or length(v_clean_name) > 30 then
    raise exception 'Team name must be 2 to 30 characters';
  end if;

  update public.squad_teams
  set team_name = v_clean_name,
      updated_at = now()
  where id = p_team_id
    and owner_profile_id = v_current_profile_id;

  if not found then
    raise exception 'Only the team owner can rename this team';
  end if;

  return true;
end;
$$;

create or replace function public.get_my_squad()
returns table (
  relationship text,
  team_id uuid,
  team_no int,
  team_name text,
  team_status text,
  team_member_count int,
  team_friend_count int,
  owner_profile_id uuid,
  profile_id uuid,
  display_name text,
  avatar_url text,
  referral_code text,
  total_score int,
  rank_position int,
  joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with me as (
    select id
    from public.profiles
    where auth_user_id = auth.uid()
  ),
  visible_teams as (
    select st.*
    from public.squad_teams st
    join me on st.owner_profile_id = me.id

    union

    select st.*
    from public.squad_team_members stm
    join public.squad_teams st on st.id = stm.team_id
    join me on stm.profile_id = me.id
  ),
  team_counts as (
    select
      stm.team_id,
      count(*)::int as team_member_count,
      count(*) filter (where stm.member_role = 'member')::int as team_friend_count
    from public.squad_team_members stm
    group by stm.team_id
  ),
  latest_scores as (
    select distinct on (profile_id)
      profile_id,
      total_score,
      rank_position
    from public.leaderboard_scores
    order by profile_id, updated_at desc
  )
  select
    case
      when vt.owner_profile_id = (select id from me) and stm.member_role = 'owner' then 'my_team_owner'
      when vt.owner_profile_id = (select id from me) then 'invited_by_me'
      when stm.profile_id = (select id from me) then 'team_i_joined'
      else 'same_team_member'
    end as relationship,
    vt.id as team_id,
    vt.team_no,
    coalesce(vt.team_name, 'Team ' || vt.team_no) as team_name,
    vt.status as team_status,
    coalesce(tc.team_member_count, 0) as team_member_count,
    coalesce(tc.team_friend_count, 0) as team_friend_count,
    vt.owner_profile_id,
    p.id as profile_id,
    coalesce(p.display_name, '未设置昵称') as display_name,
    p.avatar_url,
    p.referral_code,
    coalesce(ls.total_score, 0) as total_score,
    ls.rank_position,
    stm.joined_at
  from visible_teams vt
  join public.squad_team_members stm on stm.team_id = vt.id
  join public.profiles p on p.id = stm.profile_id
  left join team_counts tc on tc.team_id = vt.id
  left join latest_scores ls on ls.profile_id = p.id
  order by
    vt.owner_profile_id = (select id from me) desc,
    vt.team_no,
    stm.member_role desc,
    stm.joined_at asc;
$$;

grant execute on function public.rename_squad_team(uuid, text) to authenticated;
grant execute on function public.get_my_squad() to authenticated;
