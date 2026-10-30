-- Accounts are passkeys. No email or password is stored.

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  -- the WebAuthn user handle, shared by all of this user's passkeys
  handle TEXT NOT NULL UNIQUE,
  recovery_hash TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE passkeys (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  public_key TEXT NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0,
  transports TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT
);

CREATE INDEX passkeys_user ON passkeys (user_id);

-- Only a hash of the session token is stored.
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE challenges (
  id TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Groups made before accounts existed have no owner until someone pastes
-- their calendar link to claim them.
ALTER TABLE groups ADD COLUMN user_id INTEGER REFERENCES users (id) ON DELETE CASCADE;

CREATE INDEX groups_user ON groups (user_id);
