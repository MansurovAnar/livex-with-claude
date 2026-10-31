-- Telesales reporting (LV#48): history of "Phone number is not valid" / "Restore to main list".
-- telesales_leads.is_phone_invalid only holds the current state, so the report could not
-- count how many leads were marked invalid (or restored) within a date range, or by whom.
-- One row is written each time the flag actually changes. Marks made before this
-- migration have no event.

CREATE TABLE IF NOT EXISTS lead_phone_status_events (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          UUID NOT NULL REFERENCES telesales_leads(id) ON DELETE CASCADE,
  is_phone_invalid BOOLEAN NOT NULL,                          -- TRUE = marked invalid, FALSE = restored
  changed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reporting: events in a date range, and per agent
CREATE INDEX IF NOT EXISTS idx_lead_phone_status_events_changed
  ON lead_phone_status_events (changed_at);
CREATE INDEX IF NOT EXISTS idx_lead_phone_status_events_user
  ON lead_phone_status_events (changed_by, changed_at);
CREATE INDEX IF NOT EXISTS idx_lead_phone_status_events_lead
  ON lead_phone_status_events (lead_id);

-- Reporting: leads added per agent in a date range
CREATE INDEX IF NOT EXISTS idx_telesales_leads_created
  ON telesales_leads (created_by, created_at);
