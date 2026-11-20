-- LV#32: attendance of a registered student, ticked by admin/reception while the exam is ongoing.
-- A student who paid anything (amount_paid > 0) always counts as attended, see attendance.service.
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS attended    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS attended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS attended_by UUID REFERENCES users(id);
