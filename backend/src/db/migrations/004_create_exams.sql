CREATE TYPE exam_status AS ENUM ('scheduled', 'ongoing', 'completed', 'cancelled');

CREATE TABLE exams (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            VARCHAR(255) NOT NULL,
  subject_code     VARCHAR(50),
  room_id          UUID NOT NULL REFERENCES rooms(id),
  scheduled_at     TIMESTAMPTZ NOT NULL,
  duration_mins    INTEGER NOT NULL,
  entry_opens_at   TIMESTAMPTZ NOT NULL,
  entry_closes_at  TIMESTAMPTZ NOT NULL,
  status           exam_status DEFAULT 'scheduled',
  created_by       UUID NOT NULL REFERENCES users(id),
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exams_scheduled_at ON exams(scheduled_at);
CREATE INDEX idx_exams_status       ON exams(status);
