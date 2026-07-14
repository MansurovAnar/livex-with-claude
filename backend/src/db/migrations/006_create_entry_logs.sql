CREATE TYPE entry_event_type AS ENUM ('entry', 'exit');

CREATE TABLE entry_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id         UUID NOT NULL REFERENCES exams(id),
  student_id      UUID NOT NULL REFERENCES students(id),
  registration_id UUID NOT NULL REFERENCES registrations(id),
  event_type      entry_event_type NOT NULL,
  checked_by      UUID NOT NULL REFERENCES users(id),
  device_info     VARCHAR(255),
  notes           TEXT,
  logged_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_entry_logs_exam       ON entry_logs(exam_id);
CREATE INDEX idx_entry_logs_student    ON entry_logs(student_id);
CREATE INDEX idx_entry_logs_logged_at  ON entry_logs(logged_at DESC);
