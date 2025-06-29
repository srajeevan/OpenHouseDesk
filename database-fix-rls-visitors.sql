-- Fix RLS policy for visitors table to allow public check-ins
-- Run this in your Supabase SQL Editor

-- Allow anonymous users to insert into visitors table (for check-ins)
CREATE POLICY "Allow public check-ins" ON visitors
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous users to select their own visitor records (for feedback)
CREATE POLICY "Allow public visitor access" ON visitors
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Allow authenticated users (admins) to view all visitors
CREATE POLICY "Allow admin access to all visitors" ON visitors
  FOR ALL 
  TO authenticated
  USING (true);

SELECT 'RLS policies for visitors table updated successfully' as status;
