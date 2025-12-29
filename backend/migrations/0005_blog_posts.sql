-- Migration: Add blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'announcement',
  is_published INTEGER DEFAULT 0,
  author_id TEXT REFERENCES users(id),
  created_at INTEGER,
  updated_at INTEGER
);

CREATE INDEX IF NOT EXISTS blog_published_idx ON blog_posts(is_published);
CREATE INDEX IF NOT EXISTS blog_category_idx ON blog_posts(category);
