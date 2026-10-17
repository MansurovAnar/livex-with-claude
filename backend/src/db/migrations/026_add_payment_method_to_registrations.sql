-- How the registration was paid: 'card' or 'cash' (NULL while nothing is paid / for legacy rows)
ALTER TABLE registrations
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10)
  CHECK (payment_method IN ('card', 'cash'));
