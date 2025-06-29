-- Open House Database Setup Script - Fixed Version
-- Run this in your Supabase SQL Editor to fix the RLS policies

-- First, let's drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public insert on visitors" ON visitors;
DROP POLICY IF EXISTS "Allow public insert on feedback" ON feedback;
DROP POLICY IF EXISTS "Allow authenticated read on visitors" ON visitors;
DROP POLICY IF EXISTS "Allow authenticated read on feedback" ON feedback;
DROP POLICY IF EXISTS "Allow authenticated read on followups" ON followups;
DROP POLICY IF EXISTS "Allow authenticated insert/update on followups" ON followups;

-- Disable RLS temporarily to recreate policies
ALTER TABLE visitors DISABLE ROW LEVEL SECURITY;
ALTER TABLE feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE followups DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;

-- Create more permissive policies for public access
-- Allow anyone to insert visitors (for check-in)
CREATE POLICY "Enable insert for anonymous users" ON visitors
  FOR INSERT TO anon WITH CHECK (true);

-- Allow anyone to insert feedback (for feedback submission)
CREATE POLICY "Enable insert for anonymous users" ON feedback
  FOR INSERT TO anon WITH CHECK (true);

-- Allow authenticated users to read all data
CREATE POLICY "Enable read for authenticated users" ON visitors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable read for authenticated users" ON followups
  FOR SELECT TO authenticated USING (true);

-- Allow authenticated users to manage followups
CREATE POLICY "Enable all for authenticated users" ON followups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Also allow public read access for the application to work properly
CREATE POLICY "Enable read for anonymous users" ON visitors
  FOR SELECT TO anon USING (true);

CREATE POLICY "Enable read for anonymous users" ON feedback
  FOR SELECT TO anon USING (true);
