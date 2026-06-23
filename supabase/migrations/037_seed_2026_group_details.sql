create temp table if not exists pg_temp.world_cup_2026_group_seed (
  country_name text not null,
  country_code text not null,
  flag_url text not null,
  group_name text not null
) on commit drop;

insert into pg_temp.world_cup_2026_group_seed (country_name, country_code, flag_url, group_name)
values
  ('Mexico', 'MEX', 'https://flagcdn.com/w160/mx.png', 'Group A'),
  ('South Africa', 'RSA', 'https://flagcdn.com/w160/za.png', 'Group A'),
  ('South Korea', 'KOR', 'https://flagcdn.com/w160/kr.png', 'Group A'),
  ('Czechia', 'CZE', 'https://flagcdn.com/w160/cz.png', 'Group A'),
  ('Canada', 'CAN', 'https://flagcdn.com/w160/ca.png', 'Group B'),
  ('Bosnia and Herzegovina', 'BIH', 'https://flagcdn.com/w160/ba.png', 'Group B'),
  ('Qatar', 'QAT', 'https://flagcdn.com/w160/qa.png', 'Group B'),
  ('Switzerland', 'SUI', 'https://flagcdn.com/w160/ch.png', 'Group B'),
  ('Brazil', 'BRA', 'https://flagcdn.com/w160/br.png', 'Group C'),
  ('Morocco', 'MAR', 'https://flagcdn.com/w160/ma.png', 'Group C'),
  ('Haiti', 'HAI', 'https://flagcdn.com/w160/ht.png', 'Group C'),
  ('Scotland', 'SCO', 'https://flagcdn.com/w160/gb-sct.png', 'Group C'),
  ('United States', 'USA', 'https://flagcdn.com/w160/us.png', 'Group D'),
  ('Paraguay', 'PAR', 'https://flagcdn.com/w160/py.png', 'Group D'),
  ('Australia', 'AUS', 'https://flagcdn.com/w160/au.png', 'Group D'),
  ('Turkey', 'TUR', 'https://flagcdn.com/w160/tr.png', 'Group D'),
  ('Germany', 'GER', 'https://flagcdn.com/w160/de.png', 'Group E'),
  ('Curacao', 'CUW', 'https://flagcdn.com/w160/cw.png', 'Group E'),
  ('Ivory Coast', 'CIV', 'https://flagcdn.com/w160/ci.png', 'Group E'),
  ('Ecuador', 'ECU', 'https://flagcdn.com/w160/ec.png', 'Group E'),
  ('Netherlands', 'NED', 'https://flagcdn.com/w160/nl.png', 'Group F'),
  ('Japan', 'JPN', 'https://flagcdn.com/w160/jp.png', 'Group F'),
  ('Sweden', 'SWE', 'https://flagcdn.com/w160/se.png', 'Group F'),
  ('Tunisia', 'TUN', 'https://flagcdn.com/w160/tn.png', 'Group F'),
  ('Belgium', 'BEL', 'https://flagcdn.com/w160/be.png', 'Group G'),
  ('Egypt', 'EGY', 'https://flagcdn.com/w160/eg.png', 'Group G'),
  ('Iran', 'IRN', 'https://flagcdn.com/w160/ir.png', 'Group G'),
  ('New Zealand', 'NZL', 'https://flagcdn.com/w160/nz.png', 'Group G'),
  ('Spain', 'ESP', 'https://flagcdn.com/w160/es.png', 'Group H'),
  ('Cape Verde', 'CPV', 'https://flagcdn.com/w160/cv.png', 'Group H'),
  ('Saudi Arabia', 'KSA', 'https://flagcdn.com/w160/sa.png', 'Group H'),
  ('Uruguay', 'URU', 'https://flagcdn.com/w160/uy.png', 'Group H'),
  ('France', 'FRA', 'https://flagcdn.com/w160/fr.png', 'Group I'),
  ('Senegal', 'SEN', 'https://flagcdn.com/w160/sn.png', 'Group I'),
  ('Iraq', 'IRQ', 'https://flagcdn.com/w160/iq.png', 'Group I'),
  ('Norway', 'NOR', 'https://flagcdn.com/w160/no.png', 'Group I'),
  ('Argentina', 'ARG', 'https://flagcdn.com/w160/ar.png', 'Group J'),
  ('Algeria', 'ALG', 'https://flagcdn.com/w160/dz.png', 'Group J'),
  ('Austria', 'AUT', 'https://flagcdn.com/w160/at.png', 'Group J'),
  ('Jordan', 'JOR', 'https://flagcdn.com/w160/jo.png', 'Group J'),
  ('Portugal', 'POR', 'https://flagcdn.com/w160/pt.png', 'Group K'),
  ('DR Congo', 'COD', 'https://flagcdn.com/w160/cd.png', 'Group K'),
  ('Uzbekistan', 'UZB', 'https://flagcdn.com/w160/uz.png', 'Group K'),
  ('Colombia', 'COL', 'https://flagcdn.com/w160/co.png', 'Group K'),
  ('England', 'ENG', 'https://flagcdn.com/w160/gb-eng.png', 'Group L'),
  ('Croatia', 'CRO', 'https://flagcdn.com/w160/hr.png', 'Group L'),
  ('Ghana', 'GHA', 'https://flagcdn.com/w160/gh.png', 'Group L'),
  ('Panama', 'PAN', 'https://flagcdn.com/w160/pa.png', 'Group L');

update public.teams t
set country_name = s.country_name,
    country_code = s.country_code,
    name = s.country_name,
    short_name = s.country_code,
    flag_url = s.flag_url,
    flag_asset_path = s.flag_url,
    group_name = s.group_name,
    is_active = true
from pg_temp.world_cup_2026_group_seed s
where upper(coalesce(t.country_code, '')) = s.country_code
   or upper(coalesce(t.country_name, '')) = upper(s.country_name)
   or upper(coalesce(t.name, '')) = upper(s.country_name)
   or (s.country_code = 'USA' and (upper(coalesce(t.country_name, '')) in ('USA', 'UNITED STATES OF AMERICA') or upper(coalesce(t.name, '')) in ('USA', 'UNITED STATES OF AMERICA')))
   or (s.country_code = 'KOR' and (upper(coalesce(t.country_name, '')) in ('KOREA REPUBLIC', 'REPUBLIC OF KOREA') or upper(coalesce(t.name, '')) in ('KOREA REPUBLIC', 'REPUBLIC OF KOREA')))
   or (s.country_code = 'CPV' and (upper(coalesce(t.country_name, '')) = 'CABO VERDE' or upper(coalesce(t.name, '')) = 'CABO VERDE'))
   or (s.country_code = 'CUW' and (upper(coalesce(t.country_name, '')) = 'CURACAO' or upper(coalesce(t.name, '')) = 'CURACAO'))
   or (s.country_code = 'CIV' and (upper(coalesce(t.country_name, '')) = 'COTE D''IVOIRE' or upper(coalesce(t.name, '')) = 'COTE D''IVOIRE'))
   or (s.country_code = 'COD' and (upper(coalesce(t.country_name, '')) in ('CONGO DR', 'DEMOCRATIC REPUBLIC OF THE CONGO') or upper(coalesce(t.name, '')) in ('CONGO DR', 'DEMOCRATIC REPUBLIC OF THE CONGO')));

insert into public.teams (
  country_name,
  country_code,
  name,
  short_name,
  flag_url,
  flag_asset_path,
  group_name,
  is_active
)
select
  s.country_name,
  s.country_code,
  s.country_name,
  s.country_code,
  s.flag_url,
  s.flag_url,
  s.group_name,
  true
from pg_temp.world_cup_2026_group_seed s
where not exists (
  select 1
  from public.teams t
  where upper(coalesce(t.country_code, '')) = s.country_code
     or upper(coalesce(t.country_name, '')) = upper(s.country_name)
     or upper(coalesce(t.name, '')) = upper(s.country_name)
     or (s.country_code = 'USA' and (upper(coalesce(t.country_name, '')) in ('USA', 'UNITED STATES OF AMERICA') or upper(coalesce(t.name, '')) in ('USA', 'UNITED STATES OF AMERICA')))
     or (s.country_code = 'KOR' and (upper(coalesce(t.country_name, '')) in ('KOREA REPUBLIC', 'REPUBLIC OF KOREA') or upper(coalesce(t.name, '')) in ('KOREA REPUBLIC', 'REPUBLIC OF KOREA')))
     or (s.country_code = 'CPV' and (upper(coalesce(t.country_name, '')) = 'CABO VERDE' or upper(coalesce(t.name, '')) = 'CABO VERDE'))
     or (s.country_code = 'CUW' and (upper(coalesce(t.country_name, '')) = 'CURACAO' or upper(coalesce(t.name, '')) = 'CURACAO'))
     or (s.country_code = 'CIV' and (upper(coalesce(t.country_name, '')) = 'COTE D''IVOIRE' or upper(coalesce(t.name, '')) = 'COTE D''IVOIRE'))
     or (s.country_code = 'COD' and (upper(coalesce(t.country_name, '')) in ('CONGO DR', 'DEMOCRATIC REPUBLIC OF THE CONGO') or upper(coalesce(t.name, '')) in ('CONGO DR', 'DEMOCRATIC REPUBLIC OF THE CONGO'))
  )
);
