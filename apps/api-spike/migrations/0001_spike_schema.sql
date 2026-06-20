PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS discord_users (
  id TEXT PRIMARY KEY,
  username TEXT,
  display_name TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS owners (
  discord_user_id TEXT PRIMARY KEY,
  access_subject TEXT NOT NULL UNIQUE,
  access_email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'regular')),
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (discord_user_id) REFERENCES discord_users(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS chatgpt_connections (
  owner_discord_user_id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('active', 'needsReconnect', 'revoked')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (owner_discord_user_id) REFERENCES owners(discord_user_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS registered_members (
  discord_user_id TEXT PRIMARY KEY,
  assigned_owner_discord_user_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (discord_user_id) REFERENCES discord_users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (assigned_owner_discord_user_id) REFERENCES owners(discord_user_id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_registered_members_assigned_owner
  ON registered_members(assigned_owner_discord_user_id);
