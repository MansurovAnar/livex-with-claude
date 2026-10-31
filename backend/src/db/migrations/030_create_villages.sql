-- Villages / streets maintained by admin for the TeleSales module (LV#42).
-- Numbered 030 because 029 belongs to LV#41 (telesales_leads), which is stacked alongside.
CREATE TABLE IF NOT EXISTS villages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(255) NOT NULL CHECK (BTRIM(name) <> ''),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- A name may appear only once among active villages (case-insensitive);
-- a deactivated row does not block re-adding the same name.
CREATE UNIQUE INDEX IF NOT EXISTS villages_name_active_uniq
  ON villages (LOWER(name)) WHERE is_active = true;
