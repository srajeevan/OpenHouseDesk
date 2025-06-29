-- Fix RLS policies for feedback table to allow public submissions
-- Run this in your Supabase SQL Editor

-- Allow anonymous users to insert feedback
CREATE POLICY "Allow public feedback submission" ON feedback
  FOR INSERT 
  TO anon, authenticated
  WITH CHECK (true);

-- Allow anonymous users to select feedback (for checking duplicates)
CREATE POLICY "Allow public feedback access" ON feedback
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Allow authenticated users (admins) to view all feedback
CREATE POLICY "Allow admin access to all feedback" ON feedback
  FOR ALL 
  TO authenticated
  USING (true);

SELECT 'RLS policies for feedback table updated successfully' as status;
