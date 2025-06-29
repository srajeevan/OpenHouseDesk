-- Admin Table Setup Fix
-- Run this in your Supabase SQL Editor to fix admin signup issues

-- First, drop the existing admins table if it exists (to recreate with proper structure)
DROP TABLE IF EXISTS admins CASCADE;

-- Recreate admins table with proper structure
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Enable Row Level Security
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read their own admin record" ON admins;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own admin record" ON admins;
DROP POLICY IF EXISTS "Allow authenticated users to update their own admin record" ON admins;

-- Create more permissive policies for admin signup
-- Allow anyone to insert admin records (for signup)
CREATE POLICY "Allow admin signup" ON admins
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read their own admin record
CREATE POLICY "Allow authenticated users to read their own admin record" ON admins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow authenticated users to update their own admin record
CREATE POLICY "Allow authenticated users to update their own admin record" ON admins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON admins TO authenticated;
GRANT ALL ON admins TO anon;

-- Test the table structure
SELECT 'Admin table created successfully' as status;
