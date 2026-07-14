CREATE TABLE registrations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id    UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  seat_number   VARCHAR(20),
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  registered_by UUID NOT NULL REFERENCES users(id),
  UNIQUE(exam_id, student_id),
  UNIQUE(exam_id, seat_number)
);

CREATE INDEX idx_registrations_exam    ON registrations(exam_id);
CREATE INDEX idx_registrations_student ON registrations(student_id);
