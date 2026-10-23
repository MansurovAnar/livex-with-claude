-- Soft removal of a student from an exam: the registration row stays, marked as removed.
-- removed_at IS NULL = active registration.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS removed_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removed_by     UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS removal_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_registrations_exam_active
  ON registrations(exam_id) WHERE removed_at IS NULL;
