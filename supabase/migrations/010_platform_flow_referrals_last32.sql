alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('player', 'admin', 'owner'));

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles
    where auth_user_id = auth.uid()
      and role in ('admin', 'owner')
      and is_blocked = false
  )
$$;

alter table public.profiles
add column if not exists referred_by_user_id uuid references public.profiles(id);

update public.profiles
set referred_by_user_id = coalesce(referred_by_user_id, referred_by_profile_id)
where referred_by_profile_id is not null
  and referred_by_user_id is null;

alter table public.teams
add column if not exists country_name text,
add column if not exists country_code text,
add column if not exists flag_asset_path text,
add column if not exists is_active boolean default true,
add column if not exists updated_at timestamptz default now();

update public.teams
set country_name = coalesce(country_name, name),
    country_code = coalesce(country_code, short_name),
    flag_asset_path = coalesce(flag_asset_path, flag_url),
    is_active = coalesce(is_active, true),
    updated_at = now();

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  stage text not null default 'last_32',
  seed_position int not null,
  created_at timestamptz default now(),
  unique(tournament_id, stage, team_id),
  unique(tournament_id, stage, seed_position)
);

create table if not exists public.player_last32_picks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz default now(),
  unique(profile_id, tournament_id, team_id)
);

alter table public.tournaments enable row level security;
alter table public.tournament_teams enable row level security;
alter table public.player_last32_picks enable row level security;

drop policy if exists "public tournaments read" on public.tournaments;
create policy "public tournaments read" on public.tournaments
for select using (true);

drop policy if exists "admin tournaments write" on public.tournaments;
create policy "admin tournaments write" on public.tournaments
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "public tournament teams read" on public.tournament_teams;
create policy "public tournament teams read" on public.tournament_teams
for select using (true);

drop policy if exists "admin tournament teams write" on public.tournament_teams;
create policy "admin tournament teams write" on public.tournament_teams
for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "player last32 picks own read" on public.player_last32_picks;
create policy "player last32 picks own read" on public.player_last32_picks
for select using (profile_id = public.current_profile_id() or public.is_admin());

drop policy if exists "player last32 picks own insert" on public.player_last32_picks;
create policy "player last32 picks own insert" on public.player_last32_picks
for insert with check (profile_id = public.current_profile_id());

drop policy if exists "player last32 picks own delete" on public.player_last32_picks;
create policy "player last32 picks own delete" on public.player_last32_picks
for delete using (profile_id = public.current_profile_id());

drop policy if exists "public teams read" on public.teams;
create policy "public teams read" on public.teams for select using (true);

create or replace function public.get_referrer_public(p_referral_code text)
returns table (
  id uuid,
  nickname text
)
language sql
security definer
set search_path = public
as $$
  select p.id, coalesce(p.nickname, p.display_name, 'a friend') as nickname
  from public.profiles p
  where p.referral_code = upper(trim(p_referral_code))
    and p.is_blocked = false
  limit 1;
$$;

grant execute on function public.get_referrer_public(text) to anon, authenticated;

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
begin
  if v_current_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select id into v_referrer_profile_id
  from public.profiles
  where referral_code = v_clean_code
    and is_blocked = false;

  if v_referrer_profile_id is null or v_referrer_profile_id = v_current_profile_id then
    return false;
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_current_profile_id
      and (referred_by_profile_id is not null or referred_by_user_id is not null)
  ) then
    return false;
  end if;

  update public.profiles
  set referred_by_profile_id = v_referrer_profile_id,
      referred_by_user_id = v_referrer_profile_id,
      updated_at = now()
  where id = v_current_profile_id
    and referred_by_profile_id is null
    and referred_by_user_id is null;

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

  return true;
end;
$$;

create or replace function public.save_last32_teams(
  p_tournament_name text,
  p_team_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_profile_id uuid := public.current_profile_id();
  v_tournament_id uuid;
  v_team_count int;
begin
  if not public.is_admin() then
    raise exception 'Admin only';
  end if;

  select count(distinct team_id)
  into v_team_count
  from unnest(p_team_ids) as team_id;

  if v_team_count <> 32 or array_length(p_team_ids, 1) <> 32 then
    raise exception 'Please select exactly 32 unique teams.';
  end if;

  insert into public.tournaments (name, status, created_by)
  values (trim(p_tournament_name), 'active', v_admin_profile_id)
  on conflict (name) do update set
    status = excluded.status,
    updated_at = now()
  returning id into v_tournament_id;

  delete from public.tournament_teams
  where tournament_id = v_tournament_id
    and stage = 'last_32';

  insert into public.tournament_teams (tournament_id, team_id, stage, seed_position)
  select v_tournament_id, team_id, 'last_32', row_number() over ()
  from unnest(p_team_ids) as team_id;

  return v_tournament_id;
end;
$$;

grant execute on function public.save_last32_teams(text, uuid[]) to authenticated;

create or replace function public.save_my_last32_picks(
  p_tournament_id uuid,
  p_team_ids uuid[]
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid := public.current_profile_id();
  v_count int;
begin
  if v_profile_id is null then
    raise exception 'Profile not found';
  end if;

  select count(distinct team_id)
  into v_count
  from unnest(p_team_ids) as team_id;

  if v_count = 0 or v_count > 32 or v_count <> array_length(p_team_ids, 1) then
    raise exception 'Choose between 1 and 32 unique teams.';
  end if;

  delete from public.player_last32_picks
  where profile_id = v_profile_id
    and tournament_id = p_tournament_id;

  insert into public.player_last32_picks (profile_id, tournament_id, team_id)
  select v_profile_id, p_tournament_id, team_id
  from unnest(p_team_ids) as team_id;

  return v_count;
end;
$$;

grant execute on function public.save_my_last32_picks(uuid, uuid[]) to authenticated;

insert into public.games (id, name, slug, status, description)
values ('00000000-0000-0000-0000-000000000001', 'FIFA World Cup 2026', 'laozhaopai-32', 'active', 'Football champion prediction campaign')
on conflict (slug) do update set name = excluded.name, status = excluded.status, updated_at = now();

insert into public.tournaments (name, status)
values ('FIFA World Cup 2026', 'active')
on conflict (name) do update set status = excluded.status, updated_at = now();

insert into public.teams (country_name, country_code, name, short_name, flag_url, flag_asset_path, group_name, seed_no, is_active)
values
('Argentina','ARG','Argentina','ARG','/assets/flags/arg.png','/assets/flags/arg.png','A',1,true),
('Australia','AUS','Australia','AUS','/assets/flags/aus.png','/assets/flags/aus.png','A',2,true),
('Austria','AUT','Austria','AUT','','','A',3,true),
('Belgium','BEL','Belgium','BEL','','','A',4,true),
('Brazil','BRA','Brazil','BRA','/assets/flags/bra.png','/assets/flags/bra.png','B',5,true),
('Canada','CAN','Canada','CAN','','','B',6,true),
('Colombia','COL','Colombia','COL','','','B',7,true),
('Costa Rica','CRC','Costa Rica','CRC','','','B',8,true),
('Croatia','CRO','Croatia','CRO','/assets/flags/cro.png','/assets/flags/cro.png','C',9,true),
('Denmark','DEN','Denmark','DEN','','','C',10,true),
('Ecuador','ECU','Ecuador','ECU','','','C',11,true),
('England','ENG','England','ENG','/assets/flags/eng.png','/assets/flags/eng.png','C',12,true),
('France','FRA','France','FRA','/assets/flags/fra.png','/assets/flags/fra.png','D',13,true),
('Germany','GER','Germany','GER','/assets/flags/ger.png','/assets/flags/ger.png','D',14,true),
('Ghana','GHA','Ghana','GHA','','','D',15,true),
('Haiti','HAI','Haiti','HAI','','','D',16,true),
('Italy','ITA','Italy','ITA','/assets/flags/ita.png','/assets/flags/ita.png','E',17,true),
('Japan','JPN','Japan','JPN','/assets/flags/jpn.png','/assets/flags/jpn.png','E',18,true),
('Korea Republic','KOR','Korea Republic','KOR','/assets/flags/kor.png','/assets/flags/kor.png','E',19,true),
('Mexico','MEX','Mexico','MEX','/assets/flags/mex.png','/assets/flags/mex.png','E',20,true),
('Morocco','MAR','Morocco','MAR','/assets/flags/mar.png','/assets/flags/mar.png','F',21,true),
('Netherlands','NED','Netherlands','NED','/assets/flags/ned.png','/assets/flags/ned.png','F',22,true),
('New Zealand','NZL','New Zealand','NZL','','','F',23,true),
('Portugal','POR','Portugal','POR','/assets/flags/por.png','/assets/flags/por.png','F',24,true),
('Saudi Arabia','KSA','Saudi Arabia','KSA','','','G',25,true),
('Senegal','SEN','Senegal','SEN','','','G',26,true),
('Serbia','SRB','Serbia','SRB','','','G',27,true),
('South Africa','RSA','South Africa','RSA','','','G',28,true),
('Spain','ESP','Spain','ESP','/assets/flags/esp.png','/assets/flags/esp.png','H',29,true),
('Switzerland','SUI','Switzerland','SUI','','','H',30,true),
('USA','USA','USA','USA','/assets/flags/usa.png','/assets/flags/usa.png','H',31,true),
('Uruguay','URU','Uruguay','URU','','','H',32,true)
on conflict do nothing;
