-- Mountain Tracker - Neon Postgres 建表 SQL
-- 使用 mt_ 前缀避免与同数据库中其他项目的表冲突

-- 打卡记录表
CREATE TABLE IF NOT EXISTS mt_checkins (
  id SERIAL PRIMARY KEY,
  mountain_id INTEGER NOT NULL,
  user_id TEXT NOT NULL DEFAULT 'user1',
  status TEXT NOT NULL DEFAULT 'completed',
  start_date TEXT,
  end_date TEXT,
  weather TEXT,          -- JSON string: ["晴天","多云"] etc.
  notes TEXT,
  rating INTEGER,
  route_name TEXT,
  expenses TEXT,         -- JSON string: {"交通":100,"住宿":200} etc.
  companions TEXT,       -- JSON string: ["张三","李四"] etc.
  photos TEXT,           -- JSON string: ["url1","url2"] etc.
  steps TEXT,            -- JSON string: {"2024-03-15":12000,"2024-03-16":8000} etc.
  created_at TEXT
);

-- 用户表
CREATE TABLE IF NOT EXISTS mt_users (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar TEXT
);

-- 评论表
CREATE TABLE IF NOT EXISTS mt_comments (
  id SERIAL PRIMARY KEY,
  checkin_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT
);

-- 插入默认用户
INSERT INTO mt_users (user_id, name, avatar) 
VALUES ('user1', '登山客', NULL)
ON CONFLICT (user_id) DO NOTHING;
