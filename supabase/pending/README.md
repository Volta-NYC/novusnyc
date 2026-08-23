# Pending migrations

No migrations are currently pending.

The legacy tables/columns were migrated and dropped in
`20260822180002_drop_legacy_tables_and_columns.sql`. Public impact claims are
stored as explicit `site_settings.public_stat_overrides`; their automatic
values continue to come from live records. Do not add a file here as a way to
bypass migration review—production and source history must move together.
