update public.prediction_stages
set deadline_source = case
    when deadline_confirmed then 'first_round_of_32_kickoff_minus_15m'
    else 'pending_first_round_of_32_kickoff'
  end,
  updated_at = now()
where stage_key = 'last_16';
