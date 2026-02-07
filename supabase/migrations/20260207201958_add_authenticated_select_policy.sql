/*
  # Add SELECT policy for authenticated users

  1. Security Changes
    - Add SELECT policy for authenticated users on character_data table
    - Add SELECT policy for authenticated users on enrichment_metadata table
    - This allows logged-in users to read character data

  2. Notes
    - Previously only anon users could read data
    - Authenticated users were blocked from reading
*/

-- Add SELECT policy for authenticated users on character_data
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'character_data' 
    AND policyname = 'Allow authenticated read access to character data'
  ) THEN
    CREATE POLICY "Allow authenticated read access to character data"
      ON character_data
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Add SELECT policy for authenticated users on enrichment_metadata
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'enrichment_metadata' 
    AND policyname = 'Allow authenticated read access to enrichment metadata'
  ) THEN
    CREATE POLICY "Allow authenticated read access to enrichment metadata"
      ON enrichment_metadata
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
