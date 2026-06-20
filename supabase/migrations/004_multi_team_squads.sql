create table if not exists public.squad_teams (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles(id) on delete cascade,
  team_no int not null,
  status text not null default 'forming' check (status in ('forming','active','full')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(owner_profile_id, team_no)
);

create table if not exists public.squad_team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.squad_teams(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member' check (member_role in ('owner','member')),
  joined_at timestamptz default now(),
  unique(team_id, profile_id)
);

create index if not exists squad_teams_owner_idx on public.squad_teams(owner_profile_id);
create index if not exists squad_team_members_team_idx on public.squad_team_members(team_id);
create index if not exists squad_team_members_profile_idx on public.squad_team_members(profile_id);

alter table public.squad_teams enable row level security;
alter table public.squad_team_members enable row level security;

drop policy if exists "squad teams visible to members or admin" on public.squad_teams;
create policy "squad teams visible to members or admin" on public.squad_teams
for select using (
  public.is_admin()
  or owner_profile_id = public.current_profile_id()
  or exists (
    select 1 from public.squad_team_members stm
    where stm.team_id = squad_teams.id
      and stm.profile_id = public.current_profile_id()
  )
);

drop policy if exists "squad team members visible to members or admin" on public.squad_team_members;
create policy "squad team members visible to members or admin" on public.squad_team_members
for select using (
  public.is_admin()
  or profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.squad_teams st
    where st.id = squad_team_members.team_id
      and st.owner_profile_id = public.current_profile_id()
  )
  or exists (
    select 1
    from public.squad_team_members mine
    where mine.team_id = squad_team_members.team_id
      and mine.profile_id = public.current_profile_id()
  )
);

create or replace function public.update_squad_team_status(p_team_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_members int;
  v_friend_members int;
  v_next_status text;
begin
  select
    count(*),
    count(*) filter (where member_role = 'member')
  into v_total_members, v_friend_members
  from public.squad_team_members
  where team_id = p_team_id;

  v_next_status :=
    case
      when v_total_members >= 5 then 'full'
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
    ) < 5
  order by st.team_no
  limit 1;

  if v_team_id is not null then
    return v_team_id;
  end if;

  select coalesce(max(team_no), 0) + 1
  into v_next_team_no
  from public.squad_teams
  where owner_profile_id = p_owner_profile_id;

  insert into public.squad_teams (owner_profile_id, team_no)
  values (p_owner_profile_id, v_next_team_no)
  returning id into v_team_id;

  insert into public.squad_team_members (team_id, profile_id, member_role)
  values (v_team_id, p_owner_profile_id, 'owner')
  on conflict (team_id, profile_id) do nothing;

  perform public.update_squad_team_status(v_team_id);

  return v_team_id;
end;
$$;

create or replace function public.accept_referral(p_referral_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_profile_id uuid := public.current_profile_id();
  v_referrer_profile_id uuid;
  v_clean_code text := upper(trim(p_referral_code));
  v_team_id uuid;
begin
  if v_current_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select id into v_referrer_profile_id
  from public.profiles
  where referral_code = v_clean_code
    and is_blocked = false;

  if v_referrer_profile_id is null then
    return false;
  end if;

  if v_referrer_profile_id = v_current_profile_id then
    return false;
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_current_profile_id
      and referred_by_profile_id is not null
  ) then
    return false;
  end if;

  update public.profiles
  set referred_by_profile_id = v_referrer_profile_id,
      updated_at = now()
  where id = v_current_profile_id
    and referred_by_profile_id is null;

  insert into public.referrals (
    referrer_profile_id,
    referred_profile_id,
    referral_code
  )
  values (
    v_referrer_profile_id,
    v_current_profile_id,
    v_clean_code
  )
  on conflict (referrer_profile_id, referred_profile_id) do nothing;

  v_team_id := public.get_or_create_open_squad_team(v_referrer_profile_id);

  insert into public.squad_team_members (team_id, profile_id, member_role)
  values (v_team_id, v_current_profile_id, 'member')
  on conflict (team_id, profile_id) do nothing;

  perform public.update_squad_team_status(v_team_id);

  return true;
end;
$$;

create or replace function public.get_my_squad()
returns table (
  relationship text,
  team_id uuid,
  team_no int,
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

grant execute on function public.update_squad_team_status(uuid) to authenticated;
grant execute on function public.get_or_create_open_squad_team(uuid) to authenticated;
grant execute on function public.accept_referral(text) to authenticated;
grant execute on function public.get_my_squad() to authenticated;
