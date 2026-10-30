-- Leads pick their village from the admin-maintained `villages` list (LV#42),
-- so store a reference instead of free text. The text column held no data yet
-- (the lead API arrives in the same change, LV#43).
ALTER TABLE telesales_leads
  ADD COLUMN IF NOT EXISTS village_id UUID REFERENCES villages(id);

ALTER TABLE telesales_leads
  DROP COLUMN IF EXISTS village;

CREATE INDEX IF NOT EXISTS idx_telesales_leads_village ON telesales_leads (village_id);
