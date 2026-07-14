CREATE TABLE IF NOT EXISTS partner_bonus_payments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount     NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  note       TEXT,
  paid_by    UUID REFERENCES users(id) ON DELETE SET NULL,
  paid_at    TIMESTAMPTZ DEFAULT NOW()
);
