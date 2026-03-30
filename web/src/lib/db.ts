import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// Store the database in a data directory at project root
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, "app.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sports_competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      country TEXT,
      emblem_url TEXT,
      active INTEGER NOT NULL DEFAULT 0,
      current_season TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sports_teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      short_name TEXT,
      tla TEXT,
      crest_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sports_fixtures (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      external_id TEXT UNIQUE NOT NULL,
      competition_id INTEGER NOT NULL REFERENCES sports_competitions(id),
      home_team_id INTEGER NOT NULL REFERENCES sports_teams(id),
      away_team_id INTEGER NOT NULL REFERENCES sports_teams(id),
      match_date TEXT NOT NULL,
      venue TEXT,
      status TEXT NOT NULL DEFAULT 'SCHEDULED',
      home_score INTEGER,
      away_score INTEGER,
      matchday INTEGER,
      season TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sports_standings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER NOT NULL REFERENCES sports_competitions(id),
      season TEXT NOT NULL,
      team_id INTEGER NOT NULL REFERENCES sports_teams(id),
      position INTEGER NOT NULL,
      played_games INTEGER NOT NULL DEFAULT 0,
      won INTEGER NOT NULL DEFAULT 0,
      draw INTEGER NOT NULL DEFAULT 0,
      lost INTEGER NOT NULL DEFAULT 0,
      points INTEGER NOT NULL DEFAULT 0,
      goals_for INTEGER NOT NULL DEFAULT 0,
      goals_against INTEGER NOT NULL DEFAULT 0,
      goal_difference INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(competition_id, season, team_id)
    );

    CREATE TABLE IF NOT EXISTS sports_sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER REFERENCES sports_competitions(id),
      sync_type TEXT NOT NULL,
      status TEXT NOT NULL,
      message TEXT,
      synced_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string | null;
  created_at: string;
}

export function findUserByEmail(email: string): User | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email) as User | undefined;
}

export function findUserById(id: string): User | undefined {
  return getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as User | undefined;
}

export function createUser(
  id: string,
  email: string,
  passwordHash: string,
  name: string | null
): User {
  getDb()
    .prepare(
      "INSERT INTO users (id, email, password_hash, name) VALUES (?, ?, ?, ?)"
    )
    .run(id, email, passwordHash, name);
  return findUserById(id)!;
}
