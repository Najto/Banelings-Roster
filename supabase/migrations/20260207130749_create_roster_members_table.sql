/*
  # Create Roster Members Table

  1. New Tables
    - `roster_members`
      - `id` (uuid, primary key)
      - `member_name` (text, unique) - Guild member name (e.g., "Dekoya", "Klaus")
      - `role` (text) - Tank, Healer, Melee, or Range
      - `display_order` (integer) - Sort order for roster display
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `roster_members` table
    - Add policy for public read access (roster is public information)
    - Add policy for anonymous write access (collaborative editing)

  3. Important Notes
    - This table stores the guild member roster
    - Each member can have multiple characters (linked via player_name in character_data)
    - Deleting a member will cascade to their characters via application logic
*/

CREATE TABLE IF NOT EXISTS roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_name text UNIQUE NOT NULL,
  role text NOT NULL CHECK (role IN ('Tank', 'Healer', 'Melee', 'Range')),
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for faster lookups and sorting
CREATE INDEX IF NOT EXISTS idx_roster_members_name ON roster_members(member_name);
CREATE INDEX IF NOT EXISTS idx_roster_members_role_order ON roster_members(role, display_order);

-- Enable Row Level Security
ALTER TABLE roster_members ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read roster members (public roster)
CREATE POLICY "Anyone can read roster members"
  ON roster_members
  FOR SELECT
  TO public
  USING (true);

-- Policy: Anyone can insert roster members
CREATE POLICY "Anyone can insert roster members"
  ON roster_members
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Anyone can update roster members
CREATE POLICY "Anyone can update roster members"
  ON roster_members
  FOR UPDATE
  TO public
  USING (true)
  WITH CHECK (true);

-- Policy: Anyone can delete roster members
CREATE POLICY "Anyone can delete roster members"
  ON roster_members
  FOR DELETE
  TO public
  USING (true);