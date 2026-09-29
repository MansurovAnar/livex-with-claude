-- Starting student number per partner (digits only, max 7 chars, unique across partners)
ALTER TABLE partner_profiles ADD COLUMN IF NOT EXISTS initial_student_number VARCHAR(7);

-- Backfill: partners with students start from their highest numeric non-deleted student number
WITH partner_max AS (
  SELECT s.partner_id, MAX(s.student_number::bigint) AS max_num
  FROM students s
  WHERE s.partner_id IS NOT NULL
    AND s.is_active = true
    AND s.deleted_at IS NULL
    AND s.student_number ~ '^[0-9]{1,7}$'
  GROUP BY s.partner_id
)
UPDATE partner_profiles pp
SET initial_student_number = pm.max_num::text
FROM partner_max pm
WHERE pp.user_id = pm.partner_id
  AND pp.initial_student_number IS NULL;

-- Backfill: partners without students get a unique block (next thousand above every numeric student number)
WITH base AS (
  SELECT COALESCE(MAX(student_number::bigint), 0) AS max_num
  FROM students
  WHERE student_number ~ '^[0-9]{1,7}$'
), todo AS (
  SELECT user_id, ROW_NUMBER() OVER (ORDER BY created_at, user_id) AS rn
  FROM partner_profiles
  WHERE initial_student_number IS NULL
)
UPDATE partner_profiles pp
SET initial_student_number = (((base.max_num / 1000) + todo.rn) * 1000)::text
FROM base, todo
WHERE pp.user_id = todo.user_id;

ALTER TABLE partner_profiles ALTER COLUMN initial_student_number SET NOT NULL;
ALTER TABLE partner_profiles
  ADD CONSTRAINT partner_profiles_initial_student_number_key UNIQUE (initial_student_number);
ALTER TABLE partner_profiles
  ADD CONSTRAINT partner_profiles_initial_student_number_chk CHECK (initial_student_number ~ '^[0-9]{1,7}$');
