/*
  # Enable Real-Time Replication for Multi-User Collaboration

  1. Changes
    - Enable real-time replication on the `splits` table
    - Enable real-time replication on the `character_data` table
    - Enable real-time replication on the `roster_members` table
  
  2. Purpose
    - Allows multiple users to see changes instantly without page reload
    - Enables collaborative editing of split setups
    - Provides real-time updates when roster members or characters are added/modified
  
  3. Security
    - Real-time uses existing RLS policies
    - Only authenticated users with proper permissions will receive updates
*/

-- Enable real-time on splits table
ALTER PUBLICATION supabase_realtime ADD TABLE splits;

-- Enable real-time on character_data table
ALTER PUBLICATION supabase_realtime ADD TABLE character_data;

-- Enable real-time on roster_members table
ALTER PUBLICATION supabase_realtime ADD TABLE roster_members;
