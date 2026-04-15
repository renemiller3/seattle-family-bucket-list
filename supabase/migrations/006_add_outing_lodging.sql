-- Add lodging fields to outings table
ALTER TABLE outings ADD COLUMN IF NOT EXISTS lodging_name TEXT;
ALTER TABLE outings ADD COLUMN IF NOT EXISTS lodging_address TEXT;
ALTER TABLE outings ADD COLUMN IF NOT EXISTS lodging_lat DOUBLE PRECISION;
ALTER TABLE outings ADD COLUMN IF NOT EXISTS lodging_lng DOUBLE PRECISION;
