-- Open House Database Setup Script
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  visit_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comments TEXT,
  interested BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create followups table
CREATE TABLE IF NOT EXISTS followups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  last_followed_up TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitors_visit_date ON visitors(visit_date);
CREATE INDEX IF NOT EXISTS idx_visitors_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_feedback_visitor_id ON feedback(visitor_id);
CREATE INDEX IF NOT EXISTS idx_feedback_interested ON feedback(interested);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON feedback(rating);
CREATE INDEX IF NOT EXISTS idx_followups_visitor_id ON followups(visitor_id);
CREATE INDEX IF NOT EXISTS idx_followups_last_followed_up ON followups(last_followed_up);

-- Enable Row Level Security (RLS)
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (visitors can insert their own data)
CREATE POLICY "Allow public insert on visitors" ON visitors
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow public insert on feedback" ON feedback
  FOR INSERT TO anon WITH CHECK (true);

-- Create policies for authenticated users (admin access)
CREATE POLICY "Allow authenticated read on visitors" ON visitors
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on feedback" ON feedback
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated read on followups" ON followups
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert/update on followups" ON followups
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Create policies for admins table
CREATE POLICY "Allow authenticated users to read their own admin record" ON admins
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to insert their own admin record" ON admins
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow authenticated users to update their own admin record" ON admins
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Create a view for visitor feedback summary
CREATE OR REPLACE VIEW visitor_feedback_summary AS
SELECT 
  v.id,
  v.name,
  v.email,
  v.phone,
  v.visit_date,
  v.created_at,
  f.rating,
  f.comments,
  f.interested,
  f.created_at as feedback_date,
  CASE 
    WHEN fu.id IS NOT NULL THEN true 
    ELSE false 
  END as has_followup,
  fu.last_followed_up,
  fu.notes as followup_notes
FROM visitors v
LEFT JOIN feedback f ON v.id = f.visitor_id
LEFT JOIN followups fu ON v.id = fu.visitor_id
ORDER BY v.created_at DESC;

-- Grant access to the view
GRANT SELECT ON visitor_feedback_summary TO authenticated;
GRANT SELECT ON visitor_feedback_summary TO anon;
