# Automate D1 migrations with a forward-only policy

Production D1 migrations will be applied automatically by GitHub Actions before deploying the API and Web. If migration application fails, deployment stops.

Migrations are forward-only. The project will not rely on mandatory down migrations for rollback. Destructive schema changes such as dropping or renaming columns should be handled through staged migrations and application compatibility windows. When a post-migration issue occurs, recovery is handled by rolling the application forward with a corrective migration or, where safe, reverting the application while preserving schema compatibility. Production backup/export should be taken before applying migrations.
