import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

// On Vercel the deployment directory is read-only; use /tmp which is writable.
// Locally, persist in data/ so the DB survives restarts.
const DATA_DIR = process.env.VERCEL
  ? "/tmp"
  : path.join(process.cwd(), "data");
if (!process.env.VERCEL && !fs.existsSync(DATA_DIR)) {
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

    CREATE TABLE IF NOT EXISTS posters (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      fixture_id INTEGER REFERENCES sports_fixtures(id),
      week_start TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      image_path TEXT,
      error TEXT,
      generated_at TEXT,
      approved_at TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS twitter_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      twitter_user_id TEXT NOT NULL,
      twitter_username TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS twitter_oauth_state (
      state TEXT PRIMARY KEY,
      code_verifier TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS twitter_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      poster_id TEXT REFERENCES posters(id),
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      tweet_id TEXT,
      error TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS linkedin_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      linkedin_user_id TEXT NOT NULL,
      linkedin_name TEXT NOT NULL,
      access_token TEXT NOT NULL,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS linkedin_oauth_state (
      state TEXT PRIMARY KEY,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS linkedin_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      poster_id TEXT REFERENCES posters(id),
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      linkedin_post_id TEXT,
      error TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS telegram_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bot_token TEXT NOT NULL,
      chat_id TEXT NOT NULL,
      bot_username TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS telegram_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      poster_id TEXT REFERENCES posters(id),
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      telegram_message_id TEXT,
      error TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tiktok_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tiktok_open_id TEXT NOT NULL,
      tiktok_display_name TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tiktok_oauth_state (
      state TEXT PRIMARY KEY,
      code_verifier TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tiktok_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT NOT NULL,
      poster_id TEXT REFERENCES posters(id),
      scheduled_at TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      tiktok_publish_id TEXT,
      error TEXT,
      published_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Add engagement metrics columns (idempotent — SQLite throws if column exists, so we ignore those errors)
  const metricsAlterations = [
    "ALTER TABLE twitter_posts ADD COLUMN likes INTEGER DEFAULT 0",
    "ALTER TABLE twitter_posts ADD COLUMN retweets INTEGER DEFAULT 0",
    "ALTER TABLE twitter_posts ADD COLUMN replies INTEGER DEFAULT 0",
    "ALTER TABLE twitter_posts ADD COLUMN impressions INTEGER DEFAULT 0",
    "ALTER TABLE twitter_posts ADD COLUMN metrics_updated_at TEXT",
    "ALTER TABLE linkedin_posts ADD COLUMN likes INTEGER DEFAULT 0",
    "ALTER TABLE linkedin_posts ADD COLUMN comments INTEGER DEFAULT 0",
    "ALTER TABLE linkedin_posts ADD COLUMN impressions INTEGER DEFAULT 0",
    "ALTER TABLE linkedin_posts ADD COLUMN metrics_updated_at TEXT",
    "ALTER TABLE tiktok_posts ADD COLUMN views INTEGER DEFAULT 0",
    "ALTER TABLE tiktok_posts ADD COLUMN likes INTEGER DEFAULT 0",
    "ALTER TABLE tiktok_posts ADD COLUMN comments INTEGER DEFAULT 0",
    "ALTER TABLE tiktok_posts ADD COLUMN shares INTEGER DEFAULT 0",
    "ALTER TABLE tiktok_posts ADD COLUMN metrics_updated_at TEXT",
    "ALTER TABLE telegram_posts ADD COLUMN views INTEGER DEFAULT 0",
    "ALTER TABLE telegram_posts ADD COLUMN metrics_updated_at TEXT",
  ];
  for (const sql of metricsAlterations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  // Seed demo account — always ensure it exists (safe on serverless cold starts)
  db.prepare(`
    INSERT OR IGNORE INTO users (id, email, password_hash, name)
    VALUES ('demo-account-001', 'demo@gamedayng.com', '$2b$12$rOI6f9QQqdvFA2UCqmki2.nW77en0F0J9YCoQkU./1tup9kFAGgh2', 'Demo Account')
  `).run();
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
