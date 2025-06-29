-- Enhanced Features Database Setup
-- Run this in your Supabase SQL Editor after the properties setup

-- Add feedback token to visitors for unique feedback links
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS feedback_token UUID DEFAULT uuid_generate_v4();

-- Create property_sessions table for tracking active open houses
CREATE TABLE IF NOT EXISTS property_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  session_date DATE DEFAULT CURRENT_DATE,
  is_active BOOLEAN DEFAULT true,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_visitors_feedback_token ON visitors(feedback_token);
CREATE INDEX IF NOT EXISTS idx_property_sessions_property_id ON property_sessions(property_id);
CREATE INDEX IF NOT EXISTS idx_property_sessions_date ON property_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_property_sessions_active ON property_sessions(is_active);

-- Update the visitor_feedback_summary view to include feedback tokens
DROP VIEW IF EXISTS visitor_feedback_summary;

CREATE OR REPLACE VIEW visitor_feedback_summary AS
SELECT 
  v.id,
  v.name,
  v.email,
  v.phone,
  v.visit_date,
  v.created_at,
  v.property_id,
  v.feedback_token,
  p.name as property_name,
  p.address as property_address,
  f.rating,
  f.comments,
  f.interested,
  f.created_at as feedback_date,
  CASE 
    WHEN fu.id IS NOT NULL THEN true 
    ELSE false 
  END as has_followup,
  fu.last_followed_up,
  fu.notes as followup_notes,
  CASE 
    WHEN f.id IS NOT NULL THEN true 
    ELSE false 
  END as has_feedback
FROM visitors v
LEFT JOIN properties p ON v.property_id = p.id
LEFT JOIN feedback f ON v.id = f.visitor_id
LEFT JOIN followups fu ON v.id = fu.visitor_id
ORDER BY v.created_at DESC;

-- Grant permissions
GRANT ALL ON property_sessions TO authenticated;
GRANT ALL ON property_sessions TO anon;
GRANT SELECT ON visitor_feedback_summary TO authenticated;
GRANT SELECT ON visitor_feedback_summary TO anon;

-- Function to get today's visitors for a property (for feedback dropdown)
CREATE OR REPLACE FUNCTION get_todays_visitors_for_property(property_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  feedback_token UUID,
  has_feedback BOOLEAN
) 
LANGUAGE sql
AS $$
  SELECT 
    v.id,
    v.name,
    v.email,
    v.phone,
    v.feedback_token,
    CASE WHEN f.id IS NOT NULL THEN true ELSE false END as has_feedback
  FROM visitors v
  LEFT JOIN feedback f ON v.id = f.visitor_id
  WHERE v.property_id = property_uuid 
    AND DATE(v.visit_date) = CURRENT_DATE
  ORDER BY v.created_at DESC;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_todays_visitors_for_property(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_todays_visitors_for_property(UUID) TO anon;

SELECT 'Enhanced features database setup complete' as status;
