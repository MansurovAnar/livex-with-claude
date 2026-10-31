-- Add 'telesales' to the user_role enum (TeleSales module, LV#40)
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'telesales';
