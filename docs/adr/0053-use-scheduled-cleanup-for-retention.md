# Use scheduled cleanup for retention

The API Worker will include a scheduled cleanup job to enforce metadata retention periods. Cleanup covers expired candidate states, old owner notification history, old non-allowed request audits, old request and provider audits, expired connection flow states, selected context message IDs, settings audits, and connection events.

This is necessary because the project intentionally stores metadata such as Discord IDs, message IDs, selected context message IDs, notification records, and provider call metadata for limited periods. A scheduled cleanup job keeps retention behavior automatic instead of relying on manual maintenance.
