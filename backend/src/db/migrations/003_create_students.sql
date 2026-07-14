CREATE TABLE students (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_number VARCHAR(50) UNIQUE NOT NULL,
  full_name      VARCHAR(150) NOT NULL,
  email          VARCHAR(255) UNIQUE NOT NULL,
  photo_url      VARCHAR(500),
  is_active      BOOLEAN DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_students_number ON students(student_number);
CREATE INDEX idx_students_name   ON students(full_name);
