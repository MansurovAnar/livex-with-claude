-- Callbacks for telesales leads (LV#46).
-- A callback is scheduled while logging a call ("Call back on"). It belongs to the
-- user who scheduled it but is visible to every telesales user. It is marked done
-- when the next call to the lead is logged (by anyone).

CREATE TABLE IF NOT EXISTS lead_callbacks (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           UUID NOT NULL REFERENCES telesales_leads(id) ON DELETE CASCADE,
  call_id           UUID REFERENCES lead_calls(id) ON DELETE SET NULL,      -- call that scheduled it
  scheduled_by      UUID REFERENCES users(id) ON DELETE SET NULL,           -- owner
  due_at            TIMESTAMPTZ NOT NULL,
  completed_at      TIMESTAMPTZ,
  completed_call_id UUID REFERENCES lead_calls(id) ON DELETE SET NULL,      -- call that closed it
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CHECK (completed_call_id IS NULL OR completed_at IS NOT NULL)
);

-- Logging a call closes the lead's open callback before a new one can be scheduled,
-- so a lead has at most one open callback at a time
CREATE UNIQUE INDEX IF NOT EXISTS lead_callbacks_one_open_per_lead
  ON lead_callbacks (lead_id) WHERE completed_at IS NULL;

-- Callbacks tab and sidebar badge: open callbacks ordered by due time
CREATE INDEX IF NOT EXISTS idx_lead_callbacks_open_due
  ON lead_callbacks (due_at) WHERE completed_at IS NULL;
-- Call history shows the callback a call scheduled
CREATE INDEX IF NOT EXISTS idx_lead_callbacks_call ON lead_callbacks (call_id);
-- Reporting: callbacks per agent
CREATE INDEX IF NOT EXISTS idx_lead_callbacks_scheduled_by ON lead_callbacks (scheduled_by, due_at);
