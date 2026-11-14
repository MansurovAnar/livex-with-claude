-- Exam expenses (LV#33): money spent on an exam (e.g. rent, printing), added by admin
-- on the Exam Monitoring page. The sum is subtracted from "Left in hand" so it shows
-- the real amount that should remain from the exam.

CREATE TABLE IF NOT EXISTS exam_expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_id     UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  amount      NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  source      VARCHAR(10) NOT NULL CHECK (source IN ('cash', 'card')),
  explanation TEXT NOT NULL CHECK (length(btrim(explanation)) > 0),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exam_expenses_exam ON exam_expenses (exam_id, created_at);
