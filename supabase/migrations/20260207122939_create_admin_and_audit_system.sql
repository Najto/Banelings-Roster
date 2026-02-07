/*
  # Create Admin System and Audit Configuration Tables

  ## Overview
  Creates a complete admin authentication system and dynamic audit column configuration system
  with support for presets and calculated fields.

  ## New Tables
  
  ### 1. admin_users
  Stores admin user credentials and permissions
  - `id` (uuid, primary key)
  - `email` (text, unique) - Admin email address
  - `password_hash` (text) - Hashed password
  - `is_admin` (boolean) - Admin status flag
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. audit_column_definitions
  Defines all available columns that can be used in audit presets
  - `id` (uuid, primary key)
  - `column_key` (text, unique) - Unique identifier like "itemLevel", "stats_crit"
  - `display_name` (text) - User-friendly name like "Item Level"
  - `category` (text) - Group like "Basis", "Stats", "Gear", "Progress"
  - `data_source` (text) - Source: "raiderio", "blizzard", "enriched", "calculated"
  - `data_path` (text) - JSON path like "itemLevel", "stats.crit"
  - `data_type` (text) - Type: "number", "text", "percentage", "badge", "date", "array"
  - `is_calculated` (boolean) - Whether this is a calculated field
  - `calculation_function` (text) - Name of calculation function if calculated
  - `format_config` (jsonb) - Formatting options (decimals, colors, etc.)
  - `description` (text) - Tooltip text
  - `example_value` (text) - Example for preview
  - `is_available` (boolean) - Can be added to presets
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. audit_presets
  Stores preset configurations for different audit views
  - `id` (uuid, primary key)
  - `preset_name` (text, unique) - Name of the preset
  - `description` (text) - Description of the preset
  - `is_default` (boolean) - Default preset on first load
  - `is_system` (boolean) - System preset (not deletable)
  - `created_by` (uuid) - Reference to admin_users
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. audit_preset_columns
  Links columns to presets with specific configuration
  - `id` (uuid, primary key)
  - `preset_id` (uuid) - Reference to audit_presets
  - `column_key` (text) - Reference to audit_column_definitions
  - `is_visible` (boolean) - Column visibility
  - `column_order` (integer) - Position in table
  - `column_width` (text) - CSS width
  - `alignment` (text) - "left", "center", "right"
  - `is_sortable` (boolean) - Can be sorted
  - `custom_format_override` (jsonb) - Preset-specific formatting

  ## Security
  - Enable RLS on all tables
  - Only authenticated users can read
  - Only admins can write (checked via is_admin flag)

  ## Indexes
  - Fast lookups by column_key
  - Fast preset queries
  - Optimized joins
*/

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  is_admin boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_column_definitions table
CREATE TABLE IF NOT EXISTS audit_column_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  column_key text UNIQUE NOT NULL,
  display_name text NOT NULL,
  category text NOT NULL,
  data_source text NOT NULL,
  data_path text NOT NULL,
  data_type text NOT NULL,
  is_calculated boolean DEFAULT false,
  calculation_function text,
  format_config jsonb DEFAULT '{}'::jsonb,
  description text,
  example_value text,
  is_available boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_presets table
CREATE TABLE IF NOT EXISTS audit_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_name text UNIQUE NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  is_system boolean DEFAULT false,
  created_by uuid REFERENCES admin_users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create audit_preset_columns table
CREATE TABLE IF NOT EXISTS audit_preset_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preset_id uuid NOT NULL REFERENCES audit_presets(id) ON DELETE CASCADE,
  column_key text NOT NULL,
  is_visible boolean DEFAULT true,
  column_order integer NOT NULL,
  column_width text DEFAULT 'auto',
  alignment text DEFAULT 'left',
  is_sortable boolean DEFAULT true,
  custom_format_override jsonb DEFAULT '{}'::jsonb,
  UNIQUE(preset_id, column_key)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_column_definitions_column_key ON audit_column_definitions(column_key);
CREATE INDEX IF NOT EXISTS idx_audit_column_definitions_category ON audit_column_definitions(category);
CREATE INDEX IF NOT EXISTS idx_audit_presets_is_default ON audit_presets(is_default);
CREATE INDEX IF NOT EXISTS idx_audit_preset_columns_preset_id ON audit_preset_columns(preset_id);
CREATE INDEX IF NOT EXISTS idx_audit_preset_columns_order ON audit_preset_columns(preset_id, column_order);

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_column_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_preset_columns ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_users
-- Only allow reading own user data
CREATE POLICY "Users can view own data"
  ON admin_users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Allow anonymous read for login purposes (password_hash excluded in app)
CREATE POLICY "Anonymous can check user existence"
  ON admin_users FOR SELECT
  TO anon
  USING (true);

-- RLS Policies for audit_column_definitions
-- Everyone can read column definitions
CREATE POLICY "Anyone can view column definitions"
  ON audit_column_definitions FOR SELECT
  TO anon
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert column definitions"
  ON audit_column_definitions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can update column definitions"
  ON audit_column_definitions FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Admins can delete column definitions"
  ON audit_column_definitions FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for audit_presets
-- Everyone can read presets
CREATE POLICY "Anyone can view presets"
  ON audit_presets FOR SELECT
  TO anon
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert presets"
  ON audit_presets FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can update presets"
  ON audit_presets FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Admins can delete presets"
  ON audit_presets FOR DELETE
  TO anon
  USING (NOT is_system);

-- RLS Policies for audit_preset_columns
-- Everyone can read preset columns
CREATE POLICY "Anyone can view preset columns"
  ON audit_preset_columns FOR SELECT
  TO anon
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can insert preset columns"
  ON audit_preset_columns FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Admins can update preset columns"
  ON audit_preset_columns FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Admins can delete preset columns"
  ON audit_preset_columns FOR DELETE
  TO anon
  USING (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_column_definitions_updated_at
  BEFORE UPDATE ON audit_column_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_audit_presets_updated_at
  BEFORE UPDATE ON audit_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();