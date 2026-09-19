-- Café La Fe closed in August 2026, so its unfinished project comes off Our Work.
-- BroadPivot Consulting's site has been live since September 2026, and the
-- owner asked to be featured, but it was never switched on for Our Work.
-- Both updates match on name and current state, so replaying changes nothing.
update public.businesses
set showcase_enabled = false,
    updated_at = now()
where name = 'Café La Fe'
  and showcase_enabled = true;

update public.businesses
set showcase_enabled = true,
    showcase_description = 'BroadPivot Consulting is an East New York consultancy. We built a custom site that sets out each of its service areas, from compliance and operations to nonprofit, project management and government work.',
    updated_at = now()
where name = 'BroadPivot Consulting LLC'
  and coalesce(showcase_enabled, false) = false;
