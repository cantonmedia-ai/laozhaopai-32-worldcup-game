insert into public.games (id, name, slug, status, description)
values ('00000000-0000-0000-0000-000000000001', '老招牌 32强冠军竞猜赛', 'laozhaopai-32', 'active', 'Football champion prediction campaign')
on conflict (slug) do nothing;

insert into public.game_rounds (id, game_id, round_name, round_label_cn, round_order, scoring_points, status, prediction_close_at)
values
('10000000-0000-0000-0000-000000000032', '00000000-0000-0000-0000-000000000001', 'Round of 32', '32强', 1, 10, 'prediction_open', '2026-07-01 12:00:00+08'),
('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'Round of 16', '16强', 2, 15, 'not_open', '2026-07-06 12:00:00+08'),
('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Quarter Final', '8强', 3, 20, 'not_open', '2026-07-10 12:00:00+08'),
('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Semi Final', '4强', 4, 25, 'not_open', '2026-07-14 12:00:00+08'),
('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Final', '决赛', 5, 40, 'not_open', '2026-07-18 12:00:00+08')
on conflict do nothing;
