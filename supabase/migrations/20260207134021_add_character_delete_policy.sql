/*
  # Add DELETE policy for character_data table

  1. Security Changes
    - Add policy to allow anonymous users to delete characters from character_data table
    - This enables the character deletion feature in the roster overview
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'character_data' 
    AND policyname = 'Allow anonymous delete on character_data'
  ) THEN
    CREATE POLICY "Allow anonymous delete on character_data"
      ON character_data
      FOR DELETE
      TO anon
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'character_data' 
    AND policyname = 'Allow authenticated delete on character_data'
  ) THEN
    CREATE POLICY "Allow authenticated delete on character_data"
      ON character_data
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;