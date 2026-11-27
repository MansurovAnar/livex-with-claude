-- LV#50: details for some extra-info flags of a telesales lead.
-- Birthday / Marriage ceremony: optional date + whose it is (free text);
-- Someone died recently: optional date. Only kept while the flag is checked.
ALTER TABLE telesales_leads
  ADD COLUMN IF NOT EXISTS birthday_date  DATE,
  ADD COLUMN IF NOT EXISTS birthday_whose VARCHAR(100),
  ADD COLUMN IF NOT EXISTS marriage_date  DATE,
  ADD COLUMN IF NOT EXISTS marriage_whose VARCHAR(100),
  ADD COLUMN IF NOT EXISTS death_date     DATE;
