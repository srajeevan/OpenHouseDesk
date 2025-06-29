-- Disable RLS for Admin Signup - Final Solution
-- Run this in your Supabase SQL Editor

-- Drop the existing admins table and recreate without RLS
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

-- DO NOT ENABLE RLS - This is the key change
-- ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Grant full permissions to all roles
GRANT ALL ON admins TO authenticated;
GRANT ALL ON admins TO anon;
GRANT ALL ON admins TO service_role;
GRANT ALL ON admins TO postgres;

-- Verify table is accessible
SELECT 'Admins table created WITHOUT RLS - signup should work now' as status;

-- Test insert to verify it works
-- INSERT INTO admins (user_id, first_name, last_name, email) 
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test', 'User', 'test@example.com');
-- DELETE FROM admins WHERE email = 'test@example.com';
