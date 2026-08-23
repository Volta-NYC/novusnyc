-- Normalize only exact, well-established aliases already present in the
-- directory. Free-text application city_state is retained as submitted
-- provenance; the structured city/state fields remain the display fields.

update public.team
set school = case lower(trim(school))
  when 'brooklyn latin school' then 'The Brooklyn Latin School'
  when 'stuyvesant highschool' then 'Stuyvesant High School'
  when 'townsend harris' then 'Townsend Harris High School'
  when 'queens gateway to health sciences' then 'Queens Gateway to Health Sciences Secondary School'
  when 'great lakes' then 'Great Lakes Secondary School'
  when 'great lakes secondary school' then 'Great Lakes Secondary School'
  when 'taehs' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a edison' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a edison cte high school' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a edison technical high school' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a. edison cte high school' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a. edison cte highschool' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a. edison cte hs' then 'Thomas A. Edison Career and Technical Education High School'
  when 'international american university  , la , ca' then 'International American University'
  else school
end,
updated_at = now()
where lower(trim(school)) in (
  'brooklyn latin school', 'stuyvesant highschool', 'townsend harris',
  'queens gateway to health sciences', 'great lakes', 'great lakes secondary school',
  'taehs', 'thomas a edison', 'thomas a edison cte high school',
  'thomas a edison technical high school', 'thomas a. edison cte high school',
  'thomas a. edison cte highschool', 'thomas a. edison cte hs',
  'international american university  , la , ca'
);

update public.applications
set school_name = case lower(trim(school_name))
  when 'townsend harris' then 'Townsend Harris High School'
  when 'stuyvesant highschool' then 'Stuyvesant High School'
  when 'stuy' then 'Stuyvesant High School'
  when 'brooklyn latin school' then 'The Brooklyn Latin School'
  when 'brooklyn latin' then 'The Brooklyn Latin School'
  when 'great lakes' then 'Great Lakes Secondary School'
  when 'great lakes secondary school' then 'Great Lakes Secondary School'
  when 'seminole high school' then 'Seminole High School'
  when 'skyline high scchool' then 'Skyline High School'
  when 'bronx high school of sciecne' then 'Bronx High School of Science'
  when 'the baccalaureate school for global education' then 'Baccalaureate School for Global Education'
  when 'queens gateway to health sciences' then 'Queens Gateway to Health Sciences Secondary School'
  when 'queens gateway to the health sciences' then 'Queens Gateway to Health Sciences Secondary School'
  when 'queens gateway to health sciences secondary school' then 'Queens Gateway to Health Sciences Secondary School'
  when 'taehs' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a edison' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a edison technical high school' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a edison cte high school' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a. edison cte high school' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a. edison cte highschool' then 'Thomas A. Edison Career and Technical Education High School'
  when 'thomas a. edison cte hs' then 'Thomas A. Edison Career and Technical Education High School'
  when 'nyc lab school for collaborative studies' then 'NYC Lab High School for Collaborative Studies'
  when 'nyc lab school for collaborative studied' then 'NYC Lab High School for Collaborative Studies'
  when 'nyc lab school for collaborative studies' then 'NYC Lab High School for Collaborative Studies'
  when 'nyc lab high school of collaborative studies' then 'NYC Lab High School for Collaborative Studies'
  when 'nyc lab school' then 'NYC Lab High School for Collaborative Studies'
  when 'n.y.c. lab school of collaborative studies' then 'NYC Lab High School for Collaborative Studies'
  when 'n.y.c lab school for collaborative studies' then 'NYC Lab High School for Collaborative Studies'
  when 'manhattan hunter science high school' then 'Manhattan/Hunter Science High School'
  when 'high school of american studies at lehman college' then 'High School of American Studies at Lehman College'
  when 'benjamin n. cardozo' then 'Benjamin N. Cardozo High School'
  when 'nyc museum high school' then 'NYC Museum School'
  when 'staten island technical highschool' then 'Staten Island Technical High School'
  when 'international american university  , la , ca' then 'International American University'
  else school_name
end,
city = case lower(trim(city))
  when 'queens' then 'New York City'
  else city
end,
updated_at = now()
where lower(trim(school_name)) in (
  'townsend harris', 'stuyvesant highschool', 'stuy', 'brooklyn latin school', 'brooklyn latin',
  'great lakes', 'great lakes secondary school', 'seminole high school', 'skyline high scchool',
  'bronx high school of sciecne', 'the baccalaureate school for global education',
  'queens gateway to health sciences', 'queens gateway to the health sciences', 'queens gateway to health sciences secondary school',
  'taehs', 'thomas a edison', 'thomas a edison technical high school', 'thomas a edison cte high school',
  'thomas a. edison cte high school', 'thomas a. edison cte highschool', 'thomas a. edison cte hs',
  'nyc lab school for collaborative studies', 'nyc lab school for collaborative studied', 'nyc lab high school of collaborative studies',
  'nyc lab school', 'n.y.c. lab school of collaborative studies', 'n.y.c lab school for collaborative studies',
  'manhattan hunter science high school', 'high school of american studies at lehman college',
  'benjamin n. cardozo', 'nyc museum high school', 'staten island technical highschool',
  'international american university  , la , ca'
) or lower(trim(city)) = 'queens';

-- "Not Listed" is not a location and produces a misleading directory value.
update public.team
set home_city = null, updated_at = now()
where lower(trim(coalesce(home_city, ''))) = 'not listed';

notify pgrst, 'reload schema';
