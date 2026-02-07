/*
  # Add authenticated policies for all tables

  1. Security Changes
    - Add policies for authenticated users on splits table
    - Add policies for authenticated users on api_cache table  
    - Add policies for authenticated users on configuration table
    - Ensures logged-in users have same access as anonymous users

  2. Notes
    - Previously only anon users could access some tables
    - This was blocking logged-in users from using the app
*/

-- Splits table policies for authenticated users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'splits' 
    AND policyname = 'Allow authenticated read access to splits'
  ) THEN
    CREATE POLICY "Allow authenticated read access to splits"
      ON splits
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'splits' 
    AND policyname = 'Allow authenticated insert access to splits'
  ) THEN
    CREATE POLICY "Allow authenticated insert access to splits"
      ON splits
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'splits' 
    AND policyname = 'Allow authenticated update access to splits'
  ) THEN
    CREATE POLICY "Allow authenticated update access to splits"
      ON splits
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'splits' 
    AND policyname = 'Allow authenticated delete access to splits'
  ) THEN
    CREATE POLICY "Allow authenticated delete access to splits"
      ON splits
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- API cache table policies for authenticated users (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_cache') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'api_cache' 
      AND policyname = 'Allow authenticated read access to api cache'
    ) THEN
      CREATE POLICY "Allow authenticated read access to api cache"
        ON api_cache
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'api_cache' 
      AND policyname = 'Allow authenticated insert access to api cache'
    ) THEN
      CREATE POLICY "Allow authenticated insert access to api cache"
        ON api_cache
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'api_cache' 
      AND policyname = 'Allow authenticated update access to api cache'
    ) THEN
      CREATE POLICY "Allow authenticated update access to api cache"
        ON api_cache
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
  END IF;
END $$;

-- Configuration table policies for authenticated users (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'configuration') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'configuration' 
      AND policyname = 'Allow authenticated read access to configuration'
    ) THEN
      CREATE POLICY "Allow authenticated read access to configuration"
        ON configuration
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'configuration' 
      AND policyname = 'Allow authenticated insert access to configuration'
    ) THEN
      CREATE POLICY "Allow authenticated insert access to configuration"
        ON configuration
        FOR INSERT
        TO authenticated
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE tablename = 'configuration' 
      AND policyname = 'Allow authenticated update access to configuration'
    ) THEN
      CREATE POLICY "Allow authenticated update access to configuration"
        ON configuration
        FOR UPDATE
        TO authenticated
        USING (true)
        WITH CHECK (true);
    END IF;
  END IF;
END $$;
