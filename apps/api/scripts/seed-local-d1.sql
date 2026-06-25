-- Local development seed. Defaults must match docker-compose.yml and apps/web VITE_DEV_* values.
INSERT OR REPLACE INTO owner_discord_users (
  owner_discord_user_id,
  role,
  cloudflare_access_subject,
  created_at,
  updated_at
) VALUES (
  '297037130142711809',
  'admin_owner',
  'naoki.fujisawa@wakuwakup.net',
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
);
