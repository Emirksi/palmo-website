CREATE TABLE IF NOT EXISTS waitlist (
  email TEXT PRIMARY KEY NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  consent_version TEXT NOT NULL
) STRICT;

CREATE TABLE IF NOT EXISTS confirmations (
  email TEXT PRIMARY KEY NOT NULL REFERENCES waitlist(email),
  state TEXT NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'sending', 'accepted', 'failed', 'unknown')),
  attempted_at INTEGER,
  message_id TEXT
) STRICT;
