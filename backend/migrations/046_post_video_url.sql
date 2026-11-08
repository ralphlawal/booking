-- Separate video storage from image storage on business posts
ALTER TABLE business_posts ADD COLUMN IF NOT EXISTS video_url TEXT;
CREATE INDEX IF NOT EXISTS idx_business_posts_type ON business_posts(type);
