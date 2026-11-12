-- Course students: students added by admin who pay a discounted price (or nothing) for exams.
-- Price owed per exam = 0 when is_free, otherwise GREATEST(exam_cost - discount_amount, 0).
ALTER TABLE students
  ADD COLUMN IF NOT EXISTS is_course_student BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_amount   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  ADD COLUMN IF NOT EXISTS is_free           BOOLEAN       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_note     TEXT;

CREATE INDEX IF NOT EXISTS idx_students_course ON students(full_name) WHERE is_course_student = true AND is_active = true;
