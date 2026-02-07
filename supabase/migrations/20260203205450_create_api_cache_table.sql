/*
  # Create API cache table for Blizzard and Raider.IO data

  1. New Tables
    - `api_cache`
      - `id` (uuid, primary key)
      - `cache_key` (text, unique) - Combination of API source, region, realm, character name
      - `data` (jsonb) - Cached API response data
      - `expires_at` (timestamptz) - Cache expiration timestamp
      - `created_at` (timestamptz) - When the cache entry was created
      - `updated_at` (timestamptz) - When the cache entry was last updated
  
  2. Security
    - Enable RLS on `api_cache` table
    - Add policy for authenticated users to read cached data
    - Add policy for authenticated users to insert/update cached data
  
  3. Indexes
    - Index on cache_key for fast lookups
    - Index on expires_at for cleanup queries

  4. Important Notes
    - Cache entries are automatically expired based on expires_at timestamp
    - The cache_key should follow format: "source:region:realm:charactername" (e.g., "blizzard:eu:draenor:playerone")
    - Data stored in jsonb format for flexibility
*/

CREATE TABLE IF NOT EXISTS api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated users to read cache"
  ON api_cache
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow authenticated users to insert cache"
  ON api_cache
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update cache"
  ON api_cache
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_api_cache_key ON api_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_api_cache_expires ON api_cache(expires_at);
