/*
  # Add split_order column to character_data

  1. Changes
    - Add `split_order` column to `character_data` table
      - Integer type to track the order of split characters
      - Default value of 0 for main characters
      - Nullable to handle existing data gracefully
  
  2. Data Migration
    - Set split_order for existing split characters based on their current order
    - Main characters get split_order = 0 (not used but consistent)
  
  3. Notes
    - Lower split_order values appear first in the UI
    - This enables drag-and-drop reordering of split characters
*/

-- Add split_order column
ALTER TABLE character_data 
ADD COLUMN IF NOT EXISTS split_order INTEGER DEFAULT 0;

-- Set split_order for existing characters
-- For each player, assign sequential order to their split characters
DO $$
DECLARE
  player_rec RECORD;
  char_rec RECORD;
  counter INTEGER;
BEGIN
  -- Loop through each unique player
  FOR player_rec IN 
    SELECT DISTINCT player_name 
    FROM character_data 
    WHERE player_name IS NOT NULL
  LOOP
    counter := 0;
    
    -- Assign order to split characters
    FOR char_rec IN 
      SELECT id 
      FROM character_data 
      WHERE player_name = player_rec.player_name 
        AND is_main = false
      ORDER BY created_at
    LOOP
      UPDATE character_data 
      SET split_order = counter 
      WHERE id = char_rec.id;
      
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;