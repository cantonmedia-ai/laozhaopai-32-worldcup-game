insert into public.tournament_teams (tournament_id, team_id, stage, seed_position)
select
  t.id,
  team.id,
  'last_32',
  row_number() over (order by team.seed_no nulls last, team.country_name)
from public.tournaments t
cross join lateral (
  select id, seed_no, country_name
  from public.teams
  where is_active = true
  order by seed_no nulls last, country_name
  limit 32
) team
where t.name = 'FIFA World Cup 2026'
  and not exists (
    select 1
    from public.tournament_teams tt
    where tt.tournament_id = t.id
      and tt.stage = 'last_32'
  );
