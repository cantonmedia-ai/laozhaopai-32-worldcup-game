create extension if not exists pgcrypto;

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text not null,
  normalized_whatsapp text not null unique,
  email text,
  selected_country text not null,
  selected_country_code text,
  group_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  ip_address text,
  device_id text,
  user_agent text,
  is_disqualified boolean not null default false,
  admin_note text
);

create table if not exists public.game_settings (
  id uuid primary key default gen_random_uuid(),
  game_name text not null default 'Champion Guess 2026',
  prize_limit integer not null default 153,
  submission_open boolean not null default true,
  submission_close_at timestamptz,
  official_champion_country text,
  result_confirmed boolean not null default false,
  result_confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  selected_country text not null,
  rank integer not null,
  is_winner boolean not null default false,
  status text not null default 'pending_contact'
    check (status in ('pending_contact', 'contacted', 'prize_collected', 'disqualified', 'replaced_manually')),
  prize_collected_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  unique(player_id)
);

create index if not exists players_selected_country_idx on public.players(selected_country);
create index if not exists players_created_at_idx on public.players(created_at);
create index if not exists players_is_disqualified_idx on public.players(is_disqualified);
create index if not exists winners_rank_idx on public.winners(rank);
create index if not exists winners_is_winner_idx on public.winners(is_winner);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists players_set_updated_at on public.players;
create trigger players_set_updated_at
before update on public.players
for each row execute function public.set_updated_at();

drop trigger if exists game_settings_set_updated_at on public.game_settings;
create trigger game_settings_set_updated_at
before update on public.game_settings
for each row execute function public.set_updated_at();

alter table public.players enable row level security;
alter table public.game_settings enable row level security;
alter table public.winners enable row level security;

insert into public.game_settings (game_name, prize_limit, submission_open)
select 'Champion Guess 2026', 153, true
where not exists (select 1 from public.game_settings);
