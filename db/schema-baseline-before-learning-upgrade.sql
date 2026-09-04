-- Snapshot captured before the learning-modes upgrade on 2026-09-03.
-- This file is documentation only. The live database is never recreated from it.

CREATE TABLE decks(
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE cards(
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  example TEXT DEFAULT '',
  fsrs_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ipa TEXT DEFAULT ''
);

CREATE TABLE reviews(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL,
  reviewed_at TEXT NOT NULL
);

CREATE TABLE settings(
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
