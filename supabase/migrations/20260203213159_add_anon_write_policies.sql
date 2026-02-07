/*
  # Add Anonymous Write Policies

  Enables anonymous API access to write character data and enrichment metadata.
  
  ## Changes
  
  1. Character Data Table Policies
    - Add INSERT policy for anonymous users to save enriched character data
    - Add UPDATE policy for anonymous users to update existing character records
  
  2. Enrichment Metadata Table Policies
    - Add INSERT policy for anonymous users to track enrichment status
    - Add UPDATE policy for anonymous users to update enrichment timestamps
  
  ## Security Notes
  
  - Policies allow `anon` role (authenticated via API key) to write data
  - This enables the frontend application to cache API responses
  - All writes still require valid Supabase API key authentication
*/

-- Character Data: Allow anonymous inserts
DROP POLICY IF EXISTS "Allow anonymous insert on character_data" ON character_data;
CREATE POLICY "Allow anonymous insert on character_data"
  ON character_data
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Character Data: Allow anonymous updates
DROP POLICY IF EXISTS "Allow anonymous update on character_data" ON character_data;
CREATE POLICY "Allow anonymous update on character_data"
  ON character_data
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Enrichment Metadata: Allow anonymous inserts
DROP POLICY IF EXISTS "Allow anonymous insert on enrichment_metadata" ON enrichment_metadata;
CREATE POLICY "Allow anonymous insert on enrichment_metadata"
  ON enrichment_metadata
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Enrichment Metadata: Allow anonymous updates
DROP POLICY IF EXISTS "Allow anonymous update on enrichment_metadata" ON enrichment_metadata;
CREATE POLICY "Allow anonymous update on enrichment_metadata"
  ON enrichment_metadata
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);