-- Call log for telesales leads (LV#45).

-- Answers picked when logging a call. Shared by all telesales users; a typed
-- answer that matches no option is saved here as a new option.
CREATE TABLE IF NOT EXISTS call_answer_options (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label       VARCHAR(150) NOT NULL CHECK (BTRIM(label) <> ''),
  created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- One option per answer text (case- and surrounding-space-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS call_answer_options_label_uniq
  ON call_answer_options (LOWER(BTRIM(label)));

-- Starter answers
INSERT INTO call_answer_options (label) VALUES
  ('No answer'),
  ('Busy'),
  ('Phone switched off'),
  ('Interested'),
  ('Not interested'),
  ('Call back later')
ON CONFLICT DO NOTHING;

-- Every call made to a lead
CREATE TABLE IF NOT EXISTS lead_calls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES telesales_leads(id) ON DELETE CASCADE,
  called_by   UUID REFERENCES users(id) ON DELETE SET NULL,   -- telesales user (or admin) who called
  called_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answer_id   UUID NOT NULL REFERENCES call_answer_options(id),
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Latest call per lead (list) and full history (details)
CREATE INDEX IF NOT EXISTS idx_lead_calls_lead_called ON lead_calls (lead_id, called_at DESC);
-- Calls per agent per day (reporting)
CREATE INDEX IF NOT EXISTS idx_lead_calls_user_called ON lead_calls (called_by, called_at);
CREATE INDEX IF NOT EXISTS idx_lead_calls_answer      ON lead_calls (answer_id);
