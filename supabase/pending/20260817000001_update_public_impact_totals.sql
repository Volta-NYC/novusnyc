UPDATE site_settings
SET public_stat_overrides = COALESCE(public_stat_overrides, '{}'::jsonb) || jsonb_build_object(
  'homeBusinessesSupported', '170+',
  'communityOrganizations', '30',
  'aboutBusinesses', '170+',
  'aboutWebsiteProjects', '130',
  'aboutMarketingProjects', '90+'
)
WHERE id = 'singleton';
