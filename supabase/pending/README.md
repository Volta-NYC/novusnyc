# Pending post-deploy migrations

`20260823000004_drop_unused_website_planning_fields.sql` removes the unused
website `hours_logged` and `target_date` columns and retires the project-hours
certification trigger. Apply it only after the code that stops writing those
columns is deployed to production.

This is deliberately staged because the production database is shared by all
environments. Applying the destructive half before the matching code deploy
would break the currently deployed website-project save path.
