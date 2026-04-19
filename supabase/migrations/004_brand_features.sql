-- Migration 004: brand features — brief, voice, publishing config, credentials, templates
-- Run in Supabase SQL Editor against an existing database.
-- Depends on: 003_brands_training_data.sql (brands table must exist)

-- 1. Brands table: add brief fields (safe to run on existing table)
ALTER TABLE brands
  ADD COLUMN IF NOT EXISTS core_values         TEXT,
  ADD COLUMN IF NOT EXISTS content_themes      TEXT,
  ADD COLUMN IF NOT EXISTS objectives          TEXT,
  ADD COLUMN IF NOT EXISTS dislikes            TEXT,
  ADD COLUMN IF NOT EXISTS tone_of_voice       TEXT,
  ADD COLUMN IF NOT EXISTS competitors         TEXT,
  ADD COLUMN IF NOT EXISTS products_services   TEXT,
  ADD COLUMN IF NOT EXISTS target_audience     TEXT;

-- 2. Brand voice (1:1 with brands)
CREATE TABLE IF NOT EXISTS brand_voice (
  id                       TEXT PRIMARY KEY,
  brand_id                 TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  tone                     TEXT,
  style                    TEXT,
  platform_guidelines      TEXT,
  dos_and_donts            TEXT,
  sample_copy              TEXT,
  competitor_differentiation TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

-- 3. Brand publishing config (1:1 with brands, config stored as JSONB)
CREATE TABLE IF NOT EXISTS brand_publishing_config (
  id         TEXT PRIMARY KEY,
  brand_id   TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  config     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id)
);

-- 4. Brand credentials (AES-256-GCM encrypted at rest)
CREATE TABLE IF NOT EXISTS brand_credentials (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  brand_id         TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  platform         TEXT NOT NULL,
  encrypted_value  TEXT NOT NULL,
  iv               TEXT NOT NULL,
  last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at     TIMESTAMPTZ,
  UNIQUE(brand_id, platform)
);

-- 5. Brand templates (poster HTML/CSS and caption text templates)
CREATE TABLE IF NOT EXISTS brand_templates (
  id          TEXT PRIMARY KEY,
  brand_id    TEXT NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('poster', 'caption')),
  poster_type TEXT,  -- 'match-day' | 'result' | 'weekly-schedule' | 'custom'
  platform    TEXT,  -- 'facebook' | 'instagram' | etc.
  name        TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
