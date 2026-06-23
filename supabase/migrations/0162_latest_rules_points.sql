update public.game_rounds
set scoring_points = case
    when round_order = 1 then 1
    when round_order = 2 then 2
    when round_order = 3 then 4
    when round_order = 4 then 6
    when round_order = 5 then 10
    else scoring_points
  end,
  updated_at = now()
where round_order between 1 and 5;

update public.prediction_stages
set points_per_correct = case
    when stage_key = 'last_16' then 1
    when stage_key = 'last_8' then 2
    when stage_key = 'last_4' then 4
    when stage_key = 'finalists' then 6
    when stage_key = 'champion' then 10
    else points_per_correct
  end,
  updated_at = now()
where stage_key in ('last_16', 'last_8', 'last_4', 'finalists', 'champion');
