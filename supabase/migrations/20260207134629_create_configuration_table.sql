/*
  # Create Configuration Table

  1. New Tables
    - `configuration`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Configuration key (e.g., 'ilvl_thresholds')
      - `value` (jsonb) - Configuration value stored as JSON
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `configuration` table
    - Add policy for anonymous users to read configuration
    - Add policy for anonymous users to write configuration (for now, as there's no auth system)

  3. Initial Data
    - Insert default ilvl thresholds configuration:
      - min_ilvl: 615 (minimum acceptable item level)
      - mythic_ilvl: 626 (mythic track threshold)
      - heroic_ilvl: 613 (heroic track threshold)
*/

-- Create configuration table
CREATE TABLE IF NOT EXISTS configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE configuration ENABLE ROW LEVEL SECURITY;

-- Policies for anonymous access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'configuration' 
    AND policyname = 'Allow anonymous read on configuration'
  ) THEN
    CREATE POLICY "Allow anonymous read on configuration"
      ON configuration
      FOR SELECT
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'configuration' 
    AND policyname = 'Allow anonymous write on configuration'
  ) THEN
    CREATE POLICY "Allow anonymous write on configuration"
      ON configuration
      FOR ALL
      TO anon
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'configuration' 
    AND policyname = 'Allow authenticated read on configuration'
  ) THEN
    CREATE POLICY "Allow authenticated read on configuration"
      ON configuration
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'configuration' 
    AND policyname = 'Allow authenticated write on configuration'
  ) THEN
    CREATE POLICY "Allow authenticated write on configuration"
      ON configuration
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Insert default ilvl thresholds
INSERT INTO configuration (key, value)
VALUES (
  'ilvl_thresholds',
  '{"min_ilvl": 615, "mythic_ilvl": 626, "heroic_ilvl": 613}'::jsonb
)
ON CONFLICT (key) DO NOTHING;