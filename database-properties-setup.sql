-- Properties and Enhanced Visitor Management Setup
-- Run this in your Supabase SQL Editor after the admin table fix

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  description TEXT,
  property_type TEXT DEFAULT 'house',
  bedrooms INTEGER,
  bathrooms DECIMAL(3,1),
  square_feet INTEGER,
  price DECIMAL(12,2),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'sold')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add property_id to visitors table
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

-- Create indexes for properties
CREATE INDEX IF NOT EXISTS idx_properties_admin_id ON properties(admin_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at);

-- Create index for visitors property_id
CREATE INDEX IF NOT EXISTS idx_visitors_property_id ON visitors(property_id);

-- Grant permissions for properties table
GRANT ALL ON properties TO authenticated;
GRANT ALL ON properties TO anon;
GRANT ALL ON properties TO service_role;

-- Update the visitor_feedback_summary view to include property information
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
  fu.notes as followup_notes
FROM visitors v
LEFT JOIN properties p ON v.property_id = p.id
LEFT JOIN feedback f ON v.id = f.visitor_id
LEFT JOIN followups fu ON v.id = fu.visitor_id
ORDER BY v.created_at DESC;

-- Grant access to the updated view
GRANT SELECT ON visitor_feedback_summary TO authenticated;
GRANT SELECT ON visitor_feedback_summary TO anon;

-- Create a sample property for testing (optional)
-- INSERT INTO properties (admin_id, name, address, description, bedrooms, bathrooms, square_feet, price)
-- SELECT 
--   a.id,
--   'Beautiful Family Home',
--   '123 Main Street, Anytown, ST 12345',
--   'Stunning 3-bedroom home with modern amenities and beautiful garden.',
--   3,
--   2.5,
--   2200,
--   450000.00
-- FROM admins a
-- LIMIT 1;

SELECT 'Properties table and enhanced visitor tracking setup complete' as status;
