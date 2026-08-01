const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');
const { TRACKS } = require('./tracks-catalog');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'tournament.db');

// Ensure the data directory exists.
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS tournaments (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS players (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    sort_order    INTEGER NOT NULL DEFAULT 0
  );

  -- One score per (tournament, track slug, variant, player).
  -- variant is 'normal' or 'mirror'.
  CREATE TABLE IF NOT EXISTS scores (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    track_slug    TEXT NOT NULL,
    variant       TEXT NOT NULL CHECK (variant IN ('normal','mirror')),
    player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    points        INTEGER NOT NULL DEFAULT 0,
    updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (tournament_id, track_slug, variant, player_id)
  );

  CREATE INDEX IF NOT EXISTS idx_scores_tournament ON scores(tournament_id);
  CREATE INDEX IF NOT EXISTS idx_players_tournament ON players(tournament_id);
`);

// Minimal transaction helper (node:sqlite has no built-in transaction wrapper).
function transaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { db, transaction, TRACKS };
