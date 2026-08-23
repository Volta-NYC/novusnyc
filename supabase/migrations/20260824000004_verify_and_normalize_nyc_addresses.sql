update public.bids
set borough = 'Manhattan',
    updated_at = now()
where id = '-Om61035ExKQNoayWaQp';

update public.bids
set address = '1200 Waters Pl, Suite 112, Bronx, NY 10461',
    lat = 40.843898371175,
    lng = -73.839466486892,
    updated_at = now()
where id = 'af07cbd0-0425-4890-afa1-1b46430aee09';

update public.bids
set address = '253 36th St, Building 3, 4th Floor, Brooklyn, NY 11232',
    updated_at = now()
where id = '298506ab-f0ad-469d-9a00-ca55adf763a6';

update public.bids
set address = '686 Forest Ave, Staten Island, NY 10310',
    lat = 40.629497253719,
    lng = -74.111903645894,
    contact_name = 'Kristin Daggan',
    contact_email = '',
    contacts = '[{"id":"955bbaa2-c00f-4605-9c79-02ffe2944706","name":"Kristin Daggan","role":"","email":"","phone":""}]'::jsonb,
    updated_at = now()
where id = '7c60ee84-af54-4d57-b4b1-0c24f3fa3b79';

update public.bids
set address = '625 Jamaica Ave, Brooklyn, NY 11208',
    lat = 40.685906734959,
    lng = -73.881186617563,
    updated_at = now()
where id = '-Om1eEEWoXCDEAYg21AM';

update public.bids
set address = '625 Jamaica Ave, Brooklyn, NY 11208',
    borough = 'Brooklyn',
    lat = 40.685906734959,
    lng = -73.881186617563,
    updated_at = now()
where id = 'be681c62-994c-4f03-ae28-72feec23ad60';

update public.bids
set address = '27-01 Queens Plaza North, Level B, Long Island City, NY 11101',
    lat = 40.750626831276,
    lng = -73.939341300021,
    updated_at = now()
where id = '-Om2BBPQKsQHHC3T_tMo';

update public.bids
set address = '88 Essex St, 2nd Floor, Office, New York, NY 10002',
    updated_at = now()
where id = '-OnNPKgz7GNpjChmxt8a';

update public.bids
set address = '575 Fifth Ave, 14th Floor, New York, NY 10017',
    lat = 40.756575750132,
    lng = -73.978534011127,
    updated_at = now()
where id = 'd29691fc-3972-4e0e-ba4a-6349c0fec8bc';

update public.bids
set address = '253 36th St, Building 3, 4th Floor, Brooklyn, NY 11232',
    lat = 40.655995130209,
    lng = -74.00709798603,
    updated_at = now()
where id = '0dfb4af8-c0aa-49d9-b352-48a735e45027';

update public.bids
set address = '1 Liberty Plaza, 11th Floor, New York, NY 10006',
    updated_at = now()
where id = '99b8cd32-658d-411c-a04e-78d7f6aa4821';

update public.bids
set address = '157 13th St, Brooklyn, NY 11215',
    updated_at = now()
where id = '-Om1cnHbsxQxix8lkjcJ';

update public.bids
set address = '75-20 Astoria Blvd S, Suite 140, East Elmhurst, NY 11370',
    updated_at = now()
where id = '8ed41cc3-54f9-4d62-99c9-f5fbf8424fc1';

update public.bids
set address = '120-55 Queens Blvd, Suite 309, Kew Gardens, NY 11424',
    updated_at = now()
where id = '36016595-f920-45dc-8881-384b68960c70';

update public.bids
set address = '686 Forest Ave, Staten Island, NY 10310',
    lat = 40.629497253719,
    lng = -74.111903645894,
    updated_at = now()
where id in (
  'bf033383-71a6-4af2-b222-3cfdb17a0bb3',
  '4a05d24e-021e-44e8-aa90-ffd3dc4c12ed'
);

update public.bids
set address = '2555 Richmond Ave, Suite 240, Staten Island, NY 10314',
    lat = 40.58573124062,
    lng = -74.16853260963,
    updated_at = now()
where id = 'c8993910-d72a-4791-9cbb-09d3d059c0f6';

update public.bids
set zip_code = substring(address from 'NY ([0-9]{5})$'),
    updated_at = now()
where address is not null
  and address <> ''
  and address ~ 'NY [0-9]{5}$';

update public.businesses
set address = '325 Flatbush Ave, Brooklyn, NY 11217'
where id in (
  'c3f165a2-df06-4d7d-b0cc-5d03e07617d9',
  '-OpStnp56my97zyZmSyX'
);

update public.businesses
set address = '367 Chestnut St, Brooklyn, NY 11208'
where id = '18614b00-bb5e-4f05-9567-95eace4a4af6';

update public.businesses
set address = '41-20 39th St, Sunnyside, NY 11104',
    lat = 40.747064118111,
    lng = -73.925617998826
where id = '3bee8af5-260e-4145-89df-fd269ffbe075';

update public.businesses
set lat = 40.762587538878,
    lng = -73.770554692548
where id = '-OoBwDHNgAHqY1gVMS3N';

update public.businesses
set address = '686 Forest Ave, Staten Island, NY 10310',
    lat = 40.629497253719,
    lng = -74.111903645894
where id = 'e574549a-5f56-483d-b917-8228c304a863';

update public.businesses
set address = '38-05 Bell Blvd, Bayside, NY 11361',
    lat = 40.76647569934,
    lng = -73.772421694272
where id = '-Op-iKbHcuBVsVTsZetX';

update public.businesses
set address = '66 6th Ave, Brooklyn, NY 11217',
    lat = 40.680860439503,
    lng = -73.974535279629
where id = '-OqJ3FJ74FVzZWe7wrzS';

update public.businesses
set address = '261 68th St, Ground Floor, Brooklyn, NY 11220',
    lat = 40.637003115382,
    lng = -74.026571240674
where id = '-Oo6gJIs9BS3Wk2TFE1d';

update public.businesses
set address = '2550 Pitkin Ave, Brooklyn, NY 11208',
    lat = 40.674448276088,
    lng = -73.878127234123
where id = '-OrgFXRmDuP2hESypsaM';

update public.businesses
set address = '39-28 Queens Blvd, Sunnyside, NY 11104',
    lat = 40.743669140343,
    lng = -73.925043042081
where id = '10a58b0c-d890-4763-94f6-6f8b22a336b5';

update public.businesses
set address = '299 Flatbush Ave, Brooklyn, NY 11217',
    lat = 40.679016375276,
    lng = -73.973698604898
where id = '-OqJ3FO5xHzaqnZXcTzv';

update public.businesses
set address = '276 Chestnut St, Brooklyn, NY 11208',
    lat = 40.681925789466,
    lng = -73.875232007142
where id = '-Ork4TBiUmjp4ly1YT59';

update public.businesses
set address = '790 Eldert Ln, Brooklyn, NY 11208',
    lat = 40.670799023414,
    lng = -73.863230213714
where id = '-OsDnGrTlU9pZH1ZENsU';

update public.businesses
set address = '475A Bergen St, Brooklyn, NY 11217',
    lat = 40.680819551212,
    lng = -73.974637324171
where id = '-OqJ3FLGwZtVi1mZFqo3';

update public.businesses
set address = '351 Flatbush Ave, Brooklyn, NY 11238',
    lat = 40.677044374993,
    lng = -73.972270447032
where id = '-OqJ3FUNYUvxi7ppNeMp';
