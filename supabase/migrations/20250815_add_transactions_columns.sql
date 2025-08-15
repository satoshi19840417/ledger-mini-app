-- Add new columns to transactions table
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS occurred_on DATE,
  ADD COLUMN IF NOT EXISTS hash TEXT,
  ADD COLUMN IF NOT EXISTS exclude_from_totals BOOLEAN DEFAULT false;

-- Populate new columns for existing rows
UPDATE transactions
SET occurred_on = date
WHERE occurred_on IS NULL;

UPDATE transactions
SET hash = md5(
  user_id::text || '_' || date::text || '_' || amount::text || '_' ||
  COALESCE(description, '') || '_' || COALESCE(detail, '') || '_' || COALESCE(memo, '')
)
WHERE hash IS NULL;

UPDATE transactions
SET exclude_from_totals = false
WHERE exclude_from_totals IS NULL;
