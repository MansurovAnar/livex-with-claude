-- LV#10: remember which user added a student, so the reception Students page can show
-- the last student number added by reception (and pre-fill the next one).
-- Existing students stay NULL (unknown creator).

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_created_by ON students (created_by, created_at DESC);
