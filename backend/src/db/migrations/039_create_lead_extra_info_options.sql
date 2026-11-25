-- LV#72: extra-info checkboxes of telesales leads become an admin-managed list.
-- Numbered 039 because 038 is used by LV#50 (extra-info details), which is on its own branch.
-- telesales_leads.extra_info keeps storing option keys; the built-in options keep
-- their old keys so existing leads are unchanged. Options are never deleted, only deactivated.
CREATE TABLE IF NOT EXISTS lead_extra_info_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Stored in telesales_leads.extra_info; generated for options added by admins
  key         VARCHAR(60) NOT NULL UNIQUE
              DEFAULT ('opt_' || substr(md5(gen_random_uuid()::text), 1, 12)),
  label       VARCHAR(150) NOT NULL CHECK (BTRIM(label) <> ''),   -- English label
  label_az    VARCHAR(150),                                       -- Azerbaijani label (falls back to label)
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- A label may appear only once among active options (case- and surrounding-space-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS lead_extra_info_options_label_active_uniq
  ON lead_extra_info_options (LOWER(BTRIM(label))) WHERE is_active;

-- The 8 options that were hardcoded until now
INSERT INTO lead_extra_info_options (key, label, label_az, sort_order) VALUES
  ('birthday',                'Birthday',                'Ad günü',                     1),
  ('marriage_ceremony',       'Marriage ceremony',       'Toy mərasimi',                2),
  ('another_student_at_home', 'Another student at home', 'Evdə başqa şagird var',       3),
  ('someone_died_recently',   'Someone died recently',   'Yaxın vaxtda vəfat edən var', 4),
  ('someone_in_hospital',     'Someone in hospital',     'Xəstəxanada olan var',        5),
  ('father_in_russia',        'Father living in Russia', 'Atası Rusiyada yaşayır',      6),
  ('mother_died',             'Mother died',             'Anası vəfat edib',            7),
  ('father_died',             'Father died',             'Atası vəfat edib',            8)
ON CONFLICT (key) DO NOTHING;

-- Values are now checked by the API against this table
ALTER TABLE telesales_leads DROP CONSTRAINT IF EXISTS telesales_leads_extra_info_check;
