-- Telesales leads: prospective students collected by phone. Kept separate
-- from `students` (leads are not registered students yet).
CREATE TABLE IF NOT EXISTS telesales_leads (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name            VARCHAR(100) NOT NULL,
  last_name             VARCHAR(100) NOT NULL,
  father_name           VARCHAR(100),
  parent_name           VARCHAR(150),            -- mother or another parent in charge
  parent_relation       VARCHAR(50),             -- e.g. Mother, Grandmother, Uncle
  school_id             UUID NOT NULL REFERENCES schools(id),
  village               VARCHAR(255),            -- village / street name (villages list: LV#42)
  class_level           SMALLINT NOT NULL CHECK (class_level BETWEEN 1 AND 11),
  sector                VARCHAR(20) NOT NULL,
  language              VARCHAR(30) NOT NULL,
  income_source         TEXT,                    -- how the family earns money
  -- Extra info: preset flags + free text
  extra_info            TEXT[] NOT NULL DEFAULT '{}'
                        CHECK (extra_info <@ ARRAY[
                          'birthday',
                          'marriage_ceremony',
                          'another_student_at_home',
                          'someone_died_recently',
                          'someone_in_hospital',
                          'father_in_russia',
                          'mother_died',
                          'father_died'
                        ]::TEXT[]),
  another_student_class SMALLINT CHECK (another_student_class BETWEEN 1 AND 11),
  extra_info_other      TEXT,
  -- Knows someone studying in HƏDƏF
  knows_hedef_student   BOOLEAN NOT NULL DEFAULT FALSE,
  hedef_student_name    VARCHAR(150),
  is_phone_invalid      BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT telesales_leads_hedef_name_chk
    CHECK (NOT knows_hedef_student OR NULLIF(TRIM(hedef_student_name), '') IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_telesales_leads_name    ON telesales_leads (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_telesales_leads_school  ON telesales_leads (school_id);
CREATE INDEX IF NOT EXISTS idx_telesales_leads_invalid ON telesales_leads (is_phone_invalid);

-- Phone numbers of a lead (several per lead, labelled by owner).
CREATE TABLE IF NOT EXISTS lead_phones (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES telesales_leads(id) ON DELETE CASCADE,
  phone_number VARCHAR(20) NOT NULL,
  -- Digits only, so "050 123 45 67" and "0501234567" count as the same number
  phone_digits VARCHAR(20) GENERATED ALWAYS AS (regexp_replace(phone_number, '\D', '', 'g')) STORED,
  owner_label  VARCHAR(50),                      -- whose number: Father / Mother / Self / ...
  is_primary   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT lead_phones_digits_chk CHECK (phone_digits <> '')
);

-- A phone number may belong to only one lead (duplicates are blocked).
-- The API catches unique_violation on this constraint and names the existing lead.
ALTER TABLE lead_phones
  ADD CONSTRAINT lead_phones_phone_digits_key UNIQUE (phone_digits);

-- At most one primary phone per lead.
CREATE UNIQUE INDEX IF NOT EXISTS lead_phones_one_primary_uniq
  ON lead_phones (lead_id) WHERE is_primary;

CREATE INDEX IF NOT EXISTS idx_lead_phones_lead ON lead_phones (lead_id);
