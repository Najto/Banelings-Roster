/*
  # Create Character Data Persistence Schema

  1. New Tables
    - `character_data`
      - Stores enriched character information with full API data
      - Includes character name, realm, player name, role, class, and full enriched data
      - Tracks enrichment status and error information
    
    - `enrichment_metadata`
      - Tracks roster-level refresh status
      - Stores last enrichment time and success/failure counts

  2. Security
    - Enable RLS on both tables
    - Allow public read access (roster is public information)
    - Restrict write access to authenticated users only

  3. Indexes
    - Index on character_name and realm for fast lookups
    - Index on last_enriched_at for staleness checks
    - Index on enrichment_status for filtering
*/

-- Create character_data table
CREATE TABLE IF NOT EXISTS character_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_name text NOT NULL,
  realm text NOT NULL,
  player_name text,
  role text,
  class_name text,
  is_main boolean DEFAULT false,
  enriched_data jsonb,
  last_enriched_at timestamptz,
  enrichment_status text DEFAULT 'pending',
  error_count integer DEFAULT 0,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_character_realm UNIQUE (character_name, realm)
);

-- Create enrichment_metadata table
CREATE TABLE IF NOT EXISTS enrichment_metadata (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  roster_id text DEFAULT 'default' UNIQUE,
  last_enriched_at timestamptz,
  total_characters integer DEFAULT 0,
  success_count integer DEFAULT 0,
  failed_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_character_lookup ON character_data(character_name, realm);
CREATE INDEX IF NOT EXISTS idx_last_enriched ON character_data(last_enriched_at);
CREATE INDEX IF NOT EXISTS idx_enrichment_status ON character_data(enrichment_status);

-- Enable RLS
ALTER TABLE character_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrichment_metadata ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to character data"
  ON character_data
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public read access to enrichment metadata"
  ON enrichment_metadata
  FOR SELECT
  TO anon
  USING (true);

-- Allow authenticated users to insert/update character data
CREATE POLICY "Allow authenticated insert on character data"
  ON character_data
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on character data"
  ON character_data
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Allow authenticated users to insert/update enrichment metadata
CREATE POLICY "Allow authenticated insert on enrichment metadata"
  ON enrichment_metadata
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on enrichment metadata"
  ON enrichment_metadata
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);