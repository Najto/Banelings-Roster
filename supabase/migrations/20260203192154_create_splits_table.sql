/*
  # Create Splits Table for Shared Web Version

  1. New Tables
    - `splits`
      - `id` (uuid, primary key, auto-generated)
      - `guild_key` (text, unique identifier derived from spreadsheet URL)
      - `data` (jsonb, stores the full SplitGroup array configuration)
      - `created_at` (timestamptz, auto-set on creation)
      - `updated_at` (timestamptz, auto-set on update)

  2. Security
    - Enable RLS on `splits` table
    - Add policy for public read access (anyone can view splits)
    - Add policy for public write access (anyone can create/update splits)

  3. Notes
    - The guild_key is derived from the spreadsheet URL to identify different guilds
    - Data is stored as JSONB for flexibility with the SplitGroup structure
    - Public access is intentional as this is a shared collaborative tool
*/

CREATE TABLE IF NOT EXISTS splits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_key text UNIQUE NOT NULL,
  data jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_splits_guild_key ON splits(guild_key);

ALTER TABLE splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to splits"
  ON splits
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow public insert access to splits"
  ON splits
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow public update access to splits"
  ON splits
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow public delete access to splits"
  ON splits
  FOR DELETE
  TO anon
  USING (true);