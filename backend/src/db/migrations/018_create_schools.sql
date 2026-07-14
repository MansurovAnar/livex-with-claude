CREATE TABLE IF NOT EXISTS schools (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             VARCHAR(255) NOT NULL,
  location         TEXT NOT NULL,
  students_1_to_7  INTEGER NOT NULL DEFAULT 0,
  students_8_to_11 INTEGER NOT NULL DEFAULT 0,
  director_name    VARCHAR(255) NOT NULL,
  assigned_to      UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
