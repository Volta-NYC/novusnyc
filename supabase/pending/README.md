# Pending post-deploy migrations

No migrations are currently pending. The August 24 legacy cleanup was moved to
`supabase/migrations/` only after the matching application build was live and
its data guards passed.

Use this directory when a destructive schema change must wait for application
code to deploy. Document the dependency here, deploy the reader/writer changes
first, then move and apply the migration in a separate commit.
