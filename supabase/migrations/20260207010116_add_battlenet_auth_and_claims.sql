/*
  # Battle.net Authentication and Character Claims

  1. New Tables
    - `user_claims`
      - Links users to guild roster members
      - Stores Battle.net ID for verification
      - Tracks claim status and timestamps
    
    - `battlenet_characters`
      - Caches Battle.net character list per user
      - Used for claim verification
      - Includes character details from Battle.net API
  
  2. Security
    - Enable RLS on both tables
    - Users can only read/write their own data
    - Prevent duplicate claims on same roster member
  
  3. Indexes
    - Add indexes on battlenet_id for quick lookups
    - Add indexes on guild_member_name for claim verification
*/

-- Create user_claims table
CREATE TABLE IF NOT EXISTS user_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  battlenet_id text NOT NULL,
  guild_member_name text NOT NULL,
  character_name text NOT NULL,
  realm text NOT NULL,
  claimed_at timestamptz DEFAULT now() NOT NULL,
  verified boolean DEFAULT false NOT NULL,
  last_verified_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(guild_member_name)
);

-- Create battlenet_characters table
CREATE TABLE IF NOT EXISTS battlenet_characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  character_id bigint NOT NULL,
  character_name text NOT NULL,
  realm text NOT NULL,
  level integer DEFAULT 0 NOT NULL,
  class text DEFAULT '' NOT NULL,
  race text DEFAULT '' NOT NULL,
  faction text DEFAULT '' NOT NULL,
  guild_name text,
  guild_realm text,
  fetched_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, character_name, realm)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_claims_user_id ON user_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_user_claims_battlenet_id ON user_claims(battlenet_id);
CREATE INDEX IF NOT EXISTS idx_user_claims_guild_member ON user_claims(guild_member_name);
CREATE INDEX IF NOT EXISTS idx_battlenet_chars_user_id ON battlenet_characters(user_id);
CREATE INDEX IF NOT EXISTS idx_battlenet_chars_name_realm ON battlenet_characters(character_name, realm);

-- Enable RLS
ALTER TABLE user_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE battlenet_characters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_claims
CREATE POLICY "Users can view own claims"
  ON user_claims FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own claims"
  ON user_claims FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own claims"
  ON user_claims FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own claims"
  ON user_claims FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for battlenet_characters
CREATE POLICY "Users can view own Battle.net characters"
  ON battlenet_characters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Battle.net characters"
  ON battlenet_characters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Battle.net characters"
  ON battlenet_characters FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Battle.net characters"
  ON battlenet_characters FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for user_claims
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_claims_updated_at'
  ) THEN
    CREATE TRIGGER update_user_claims_updated_at
      BEFORE UPDATE ON user_claims
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;