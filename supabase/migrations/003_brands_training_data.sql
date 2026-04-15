-- Migration 003: brands and training data library
-- Run in Supabase SQL Editor against an existing database.

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_data_items (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_type TEXT NOT NULL, -- post, caption, poster, competitor, inspiration
  content TEXT NOT NULL DEFAULT '',
  platform TEXT,              -- twitter, linkedin, instagram, tiktok, etc.
  tone TEXT,
  campaign TEXT,
  sentiment TEXT NOT NULL DEFAULT 'positive', -- positive, negative
  source_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
