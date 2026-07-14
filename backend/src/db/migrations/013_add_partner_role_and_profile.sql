-- Add 'partner' to the user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'partner';

-- Partner profile table (extra fields for partner users)
CREATE TABLE IF NOT EXISTS partner_profiles (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  school              VARCHAR(255) NOT NULL,
  school_address      TEXT NOT NULL,
  number_of_students  INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS partner_profiles_user_id_idx ON partner_profiles(user_id);
