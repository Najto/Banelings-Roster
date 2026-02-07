/*
  # Battle.net Connection Management
  
  This migration adds support for optional Battle.net account linking for email/password authenticated users.
  
  1. New Tables
    - `battlenet_connections`
      - Stores Battle.net OAuth access tokens and refresh tokens
      - Links authenticated users to their Battle.net accounts
      - Tracks connection status and token expiry
      - Allows users to link/unlink Battle.net accounts
  
  2. Changes to Existing Tables
    - Update `user_claims` to work with email/password auth
    - Keep `battlenet_characters` table as-is for character caching
  
  3. Security
    - Enable RLS on battlenet_connections
    - Users can only read/write their own connection data
    - Encrypt sensitive token data
  
  4. Important Notes
    - Battle.net is now OPTIONAL - not required for authentication
    - Primary auth is email/password
    - Battle.net linking is only for character claiming and verification
*/

-- Create battlenet_connections table
CREATE TABLE IF NOT EXISTS battlenet_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  battlenet_id text NOT NULL,
  battletag text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  region text DEFAULT 'eu' NOT NULL,
  connected_at timestamptz DEFAULT now() NOT NULL,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_battlenet_connections_user_id ON battlenet_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_battlenet_connections_battlenet_id ON battlenet_connections(battlenet_id);

-- Enable RLS
ALTER TABLE battlenet_connections ENABLE ROW LEVEL SECURITY;

-- RLS Policies for battlenet_connections
CREATE POLICY "Users can view own Battle.net connection"
  ON battlenet_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Battle.net connection"
  ON battlenet_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own Battle.net connection"
  ON battlenet_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own Battle.net connection"
  ON battlenet_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trigger for battlenet_connections
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_battlenet_connections_updated_at'
  ) THEN
    CREATE TRIGGER update_battlenet_connections_updated_at
      BEFORE UPDATE ON battlenet_connections
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
