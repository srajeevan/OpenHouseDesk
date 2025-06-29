-- Enhanced Forms Database Schema
-- Run this in your Supabase SQL Editor

-- Add new columns to visitors table for check-in form data
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS home_buying_status TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS looking_to_buy_within TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS budget_range TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS financing_status TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS how_did_you_hear TEXT;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS how_did_you_hear_other TEXT;

-- Add new columns to feedback table for enhanced feedback
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS liked_most TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS liked_least TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS comparison_to_others TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS meets_needs TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS would_make_offer TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS perceived_value TEXT;
ALTER TABLE feedback ADD COLUMN IF NOT EXISTS follow_up_preference TEXT;

-- Update the visitor_feedback_summary view to include new fields
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
  v.home_buying_status,
  v.looking_to_buy_within,
  v.budget_range,
  v.financing_status,
  v.how_did_you_hear,
  v.how_did_you_hear_other,
  p.name as property_name,
  p.address as property_address,
  f.rating,
  f.comments,
  f.interested,
  f.liked_most,
  f.liked_least,
  f.comparison_to_others,
  f.meets_needs,
  f.would_make_offer,
  f.perceived_value,
  f.follow_up_preference,
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
GRANT SELECT ON visitor_feedback_summary TO authenticated;
GRANT SELECT ON visitor_feedback_summary TO anon;

SELECT 'Enhanced forms database schema updated successfully' as status;
