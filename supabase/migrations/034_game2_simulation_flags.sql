alter table public.knockout_matches
add column if not exists is_simulation boolean not null default false;

alter table public.solo_match_predictions
add column if not exists is_simulation boolean not null default false;

alter table public.game_teams
add column if not exists is_simulation boolean not null default false;

alter table public.game_team_members
add column if not exists is_simulation boolean not null default false;

alter table public.team_match_predictions
add column if not exists is_simulation boolean not null default false;

alter table public.team_score_summary
add column if not exists is_simulation boolean not null default false;
