-- Migration: multi-tenant user isolation
-- Adds user_id to all credential, post-queue, and poster tables so that
-- each user has their own social accounts, posts, and poster library.
--
-- Run this against existing databases. schema.sql already includes these columns
-- for fresh installs.

-- Posters
ALTER TABLE posters
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

-- Backfill existing rows to demo account
UPDATE posters SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE posters ALTER COLUMN user_id SET NOT NULL;

-- Twitter credentials
ALTER TABLE twitter_credentials
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE twitter_credentials SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE twitter_credentials ALTER COLUMN user_id SET NOT NULL;

-- Twitter OAuth state (needs user_id so callback can associate cred with user)
ALTER TABLE twitter_oauth_state
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE twitter_oauth_state SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE twitter_oauth_state ALTER COLUMN user_id SET NOT NULL;

-- Twitter posts
ALTER TABLE twitter_posts
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE twitter_posts SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE twitter_posts ALTER COLUMN user_id SET NOT NULL;

-- LinkedIn credentials
ALTER TABLE linkedin_credentials
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE linkedin_credentials SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE linkedin_credentials ALTER COLUMN user_id SET NOT NULL;

-- LinkedIn OAuth state
ALTER TABLE linkedin_oauth_state
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE linkedin_oauth_state SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE linkedin_oauth_state ALTER COLUMN user_id SET NOT NULL;

-- LinkedIn posts
ALTER TABLE linkedin_posts
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE linkedin_posts SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE linkedin_posts ALTER COLUMN user_id SET NOT NULL;

-- TikTok credentials
ALTER TABLE tiktok_credentials
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE tiktok_credentials SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE tiktok_credentials ALTER COLUMN user_id SET NOT NULL;

-- TikTok OAuth state
ALTER TABLE tiktok_oauth_state
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE tiktok_oauth_state SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE tiktok_oauth_state ALTER COLUMN user_id SET NOT NULL;

-- TikTok posts
ALTER TABLE tiktok_posts
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE tiktok_posts SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE tiktok_posts ALTER COLUMN user_id SET NOT NULL;

-- Telegram credentials
ALTER TABLE telegram_credentials
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE telegram_credentials SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE telegram_credentials ALTER COLUMN user_id SET NOT NULL;

-- Telegram posts
ALTER TABLE telegram_posts
  ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

UPDATE telegram_posts SET user_id = 'demo-account-001' WHERE user_id IS NULL;

ALTER TABLE telegram_posts ALTER COLUMN user_id SET NOT NULL;
