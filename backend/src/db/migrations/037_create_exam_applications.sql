-- LV#81: applications sent from the public landing page form (no login). Reception
-- sees them in "Applications for Exams" and marks them "Added to Exam" (status 'moved')
-- once the student has been added to the exam by hand.

CREATE TABLE IF NOT EXISTS exam_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id       UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  first_name    VARCHAR(50) NOT NULL,
  last_name     VARCHAR(50) NOT NULL,
  father_name   VARCHAR(50) NOT NULL,
  class_level   SMALLINT NOT NULL CHECK (class_level BETWEEN 1 AND 11),
  sector        VARCHAR(20) NOT NULL,
  language      VARCHAR(30) NOT NULL,
  mobile_number VARCHAR(10) NOT NULL,
  status        VARCHAR(10) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'moved')),
  moved_at      TIMESTAMPTZ,
  moved_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_applications_status ON exam_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exam_applications_exam ON exam_applications (exam_id, mobile_number);
