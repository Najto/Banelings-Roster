/*
  # Add Version Key Support to Splits Table

  1. Changes
    - Add `version_key` column to splits table with values 'main', 'alt1', 'alt2', 'alt3'
    - Set default value to 'main' for backward compatibility
    - Update unique constraint to composite (guild_key, version_key) instead of just guild_key
    - Ensure existing data gets version_key = 'main'
    
  2. Security
    - Maintains existing RLS policies
    - No changes to access control
    
  3. Migration Strategy
    - Uses ALTER TABLE to add column with default value
    - Drops old unique constraint and creates new composite one
    - Preserves all existing data including the record with ID '32504143-582d-4176-8338-414963452d32'
*/

-- Add version_key column with default value 'main'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'splits' AND column_name = 'version_key'
  ) THEN
    ALTER TABLE splits ADD COLUMN version_key text NOT NULL DEFAULT 'main';
    
    -- Add check constraint to ensure only valid values
    ALTER TABLE splits ADD CONSTRAINT version_key_check 
      CHECK (version_key IN ('main', 'alt1', 'alt2', 'alt3'));
  END IF;
END $$;

-- Drop the old unique constraint on guild_key if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'splits_guild_key_key' AND conrelid = 'splits'::regclass
  ) THEN
    ALTER TABLE splits DROP CONSTRAINT splits_guild_key_key;
  END IF;
END $$;

-- Create new composite unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'splits_guild_version_unique' AND conrelid = 'splits'::regclass
  ) THEN
    ALTER TABLE splits ADD CONSTRAINT splits_guild_version_unique 
      UNIQUE (guild_key, version_key);
  END IF;
END $$;

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_splits_guild_version ON splits(guild_key, version_key);