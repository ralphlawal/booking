-- Post engagement: likes and saves
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES business_posts(id) ON DELETE CASCADE,
  consumer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, consumer_id)
);
CREATE INDEX IF NOT EXISTS idx_post_likes_post     ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_consumer ON post_likes(consumer_id);

CREATE TABLE IF NOT EXISTS post_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES business_posts(id) ON DELETE CASCADE,
  consumer_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, consumer_id)
);
CREATE INDEX IF NOT EXISTS idx_post_saves_post     ON post_saves(post_id);
CREATE INDEX IF NOT EXISTS idx_post_saves_consumer ON post_saves(consumer_id);

ALTER TABLE business_posts ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE business_posts ADD COLUMN IF NOT EXISTS save_count INTEGER NOT NULL DEFAULT 0;
