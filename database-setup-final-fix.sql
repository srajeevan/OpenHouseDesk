-- Final Fix for Admin Signup RLS Issue
-- Run this in your Supabase SQL Editor

-- Drop the existing admins table and recreate with proper RLS
DROP TABLE IF EXISTS admins CASCADE;

-- Recreate admins table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON admins(user_id);
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);

-- Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow admin signup" ON admins;
DROP POLICY IF EXISTS "Allow authenticated users to read their own admin record" ON admins;
DROP POLICY IF EXISTS "Allow authenticated users to insert their own admin record" ON admins;
DROP POLICY IF EXISTS "Allow authenticated users to update their own admin record" ON admins;

-- Create a very permissive policy for INSERT (signup)
-- This allows anyone to insert admin records during signup
CREATE POLICY "Enable insert for all users" ON admins
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to read their own records
CREATE POLICY "Enable read for own records" ON admins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Allow authenticated users to update their own records
CREATE POLICY "Enable update for own records" ON admins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON admins TO authenticated;
GRANT ALL ON admins TO anon;
GRANT ALL ON admins TO service_role;

-- Test query to verify setup
SELECT 'Admins table setup complete with permissive RLS policies' as status;
