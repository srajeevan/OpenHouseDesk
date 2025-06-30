-- Create Demo Admin Account for Realtors to Test
-- Email: admin@openhousedesk.com
-- Password: 890712

-- First, you need to create the user in Supabase Auth Dashboard or via API
-- This SQL script will create the admin record once the user is created

-- Insert demo admin record
-- Replace 'USER_ID_FROM_SUPABASE_AUTH' with the actual user ID after creating the user in Supabase Auth
INSERT INTO admins (
  id,
  user_id,
  first_name,
  last_name,
  email,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'USER_ID_FROM_SUPABASE_AUTH', -- Replace this with actual user ID from Supabase Auth
  'Demo',
  'Admin',
  'admin@openhousedesk.com',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify the admin was created
SELECT * FROM admins WHERE email = 'admin@openhousedesk.com';
