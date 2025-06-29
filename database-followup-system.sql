-- Follow-up System Database Schema
-- Run this script in your Supabase SQL editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Follow-up campaigns table
CREATE TABLE IF NOT EXISTS follow_up_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  
  -- Campaign settings
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms', 'both')),
  trigger_condition TEXT NOT NULL CHECK (trigger_condition IN ('interested', 'all', 'no_feedback', 'manual')),
  delay_hours INTEGER DEFAULT 24,
  
  -- Email settings
  email_subject TEXT,
  email_template TEXT,
  email_from_name TEXT DEFAULT 'Open House Team',
  
  -- SMS settings
  sms_template TEXT,
  
  -- Campaign status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Follow-up logs table for tracking sent messages
CREATE TABLE IF NOT EXISTS follow_up_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES follow_up_campaigns(id) ON DELETE SET NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admins(id) ON DELETE SET NULL,
  
  -- Message details
  message_type TEXT NOT NULL CHECK (message_type IN ('email', 'sms')),
  recipient_email TEXT,
  recipient_phone TEXT,
  subject TEXT,
  message_content TEXT NOT NULL,
  
  -- Delivery tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced', 'opened', 'clicked')),
  external_id TEXT, -- Twilio message SID or Resend message ID
  error_message TEXT,
  
  -- Timestamps
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Email templates table for reusable templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  subject TEXT NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT,
  variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names like ["visitor_name", "property_name"]
  category TEXT DEFAULT 'follow_up',
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SMS templates table for reusable templates
CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb, -- Array of variable names
  category TEXT DEFAULT 'follow_up',
  admin_id UUID REFERENCES admins(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unsubscribe management
CREATE TABLE IF NOT EXISTS unsubscribes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  phone TEXT,
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  unsubscribe_type TEXT NOT NULL CHECK (unsubscribe_type IN ('email', 'sms', 'both')),
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure at least one contact method is provided
  CONSTRAINT check_contact_method CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_follow_up_campaigns_property_id ON follow_up_campaigns(property_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_campaigns_status ON follow_up_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_logs_visitor_id ON follow_up_logs(visitor_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_logs_campaign_id ON follow_up_logs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_logs_status ON follow_up_logs(status);
CREATE INDEX IF NOT EXISTS idx_follow_up_logs_sent_at ON follow_up_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_email ON unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_unsubscribes_phone ON unsubscribes(phone);

-- RLS Policies
ALTER TABLE follow_up_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_up_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribes ENABLE ROW LEVEL SECURITY;

-- Policies for follow_up_campaigns
CREATE POLICY "Admins can manage their campaigns" ON follow_up_campaigns
  FOR ALL USING (
    admin_id IN (
      SELECT id FROM admins WHERE user_id = auth.uid()
    )
  );

-- Policies for follow_up_logs
CREATE POLICY "Admins can view their follow-up logs" ON follow_up_logs
  FOR SELECT USING (
    admin_id IN (
      SELECT id FROM admins WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can insert follow-up logs" ON follow_up_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update follow-up logs" ON follow_up_logs
  FOR UPDATE USING (true);

-- Policies for email_templates
CREATE POLICY "Admins can manage their email templates" ON email_templates
  FOR ALL USING (
    admin_id IN (
      SELECT id FROM admins WHERE user_id = auth.uid()
    )
  );

-- Policies for sms_templates
CREATE POLICY "Admins can manage their SMS templates" ON sms_templates
  FOR ALL USING (
    admin_id IN (
      SELECT id FROM admins WHERE user_id = auth.uid()
    )
  );

-- Policies for unsubscribes
CREATE POLICY "Anyone can insert unsubscribes" ON unsubscribes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view unsubscribes" ON unsubscribes
  FOR SELECT USING (
    visitor_id IN (
      SELECT v.id FROM visitors v
      JOIN properties p ON v.property_id = p.id
      JOIN admins a ON p.admin_id = a.id
      WHERE a.user_id = auth.uid()
    )
  );

-- Functions for automated triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_follow_up_campaigns_updated_at 
  BEFORE UPDATE ON follow_up_campaigns 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at 
  BEFORE UPDATE ON email_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sms_templates_updated_at 
  BEFORE UPDATE ON sms_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default email templates
INSERT INTO email_templates (name, description, subject, html_content, text_content, variables, category) VALUES
(
  'Welcome Follow-up',
  'Thank visitors for attending the open house',
  'Thank you for visiting {{property_name}}!',
  '<html><body><h2>Thank you for visiting {{property_name}}!</h2><p>Hi {{visitor_name}},</p><p>Thank you for taking the time to visit our open house at {{property_address}}. We hope you enjoyed exploring the property.</p><p>If you have any questions or would like to schedule a private showing, please don''t hesitate to reach out.</p><p>Best regards,<br>{{admin_name}}</p></body></html>',
  'Thank you for visiting {{property_name}}!\n\nHi {{visitor_name}},\n\nThank you for taking the time to visit our open house at {{property_address}}. We hope you enjoyed exploring the property.\n\nIf you have any questions or would like to schedule a private showing, please don''t hesitate to reach out.\n\nBest regards,\n{{admin_name}}',
  '["visitor_name", "property_name", "property_address", "admin_name"]',
  'follow_up'
),
(
  'Interested Visitor Follow-up',
  'Follow up with visitors who showed interest',
  'Let''s discuss {{property_name}} further',
  '<html><body><h2>Great to see your interest in {{property_name}}!</h2><p>Hi {{visitor_name}},</p><p>We noticed you expressed interest in our property at {{property_address}}. We''d love to help you take the next steps.</p><p>Would you like to:</p><ul><li>Schedule a private showing</li><li>Discuss financing options</li><li>Get more information about the neighborhood</li></ul><p>Please reply to this email or call us to discuss further.</p><p>Best regards,<br>{{admin_name}}</p></body></html>',
  'Great to see your interest in {{property_name}}!\n\nHi {{visitor_name}},\n\nWe noticed you expressed interest in our property at {{property_address}}. We''d love to help you take the next steps.\n\nWould you like to:\n- Schedule a private showing\n- Discuss financing options\n- Get more information about the neighborhood\n\nPlease reply to this email or call us to discuss further.\n\nBest regards,\n{{admin_name}}',
  '["visitor_name", "property_name", "property_address", "admin_name"]',
  'follow_up'
);

-- Insert default SMS templates
INSERT INTO sms_templates (name, description, content, variables, category) VALUES
(
  'Thank You SMS',
  'Quick thank you message after open house visit',
  'Hi {{visitor_name}}! Thanks for visiting {{property_name}} today. Any questions? Reply to this message or call us. - {{admin_name}}',
  '["visitor_name", "property_name", "admin_name"]',
  'follow_up'
),
(
  'Interested Follow-up SMS',
  'Follow up with interested visitors',
  'Hi {{visitor_name}}! Saw you''re interested in {{property_name}}. Let''s chat about next steps! When works for a call? - {{admin_name}}',
  '["visitor_name", "property_name", "admin_name"]',
  'follow_up'
);

-- View for campaign analytics
CREATE OR REPLACE VIEW campaign_analytics AS
SELECT 
  c.id as campaign_id,
  c.name as campaign_name,
  c.message_type,
  c.trigger_condition,
  COUNT(l.id) as total_sent,
  COUNT(CASE WHEN l.status = 'delivered' THEN 1 END) as delivered_count,
  COUNT(CASE WHEN l.status = 'opened' THEN 1 END) as opened_count,
  COUNT(CASE WHEN l.status = 'clicked' THEN 1 END) as clicked_count,
  COUNT(CASE WHEN l.status = 'failed' THEN 1 END) as failed_count,
  ROUND(
    COUNT(CASE WHEN l.status = 'delivered' THEN 1 END)::numeric / 
    NULLIF(COUNT(l.id), 0) * 100, 2
  ) as delivery_rate,
  ROUND(
    COUNT(CASE WHEN l.status = 'opened' THEN 1 END)::numeric / 
    NULLIF(COUNT(CASE WHEN l.status = 'delivered' THEN 1 END), 0) * 100, 2
  ) as open_rate,
  ROUND(
    COUNT(CASE WHEN l.status = 'clicked' THEN 1 END)::numeric / 
    NULLIF(COUNT(CASE WHEN l.status = 'opened' THEN 1 END), 0) * 100, 2
  ) as click_rate
FROM follow_up_campaigns c
LEFT JOIN follow_up_logs l ON c.id = l.campaign_id
GROUP BY c.id, c.name, c.message_type, c.trigger_condition;

-- Function to get visitors eligible for follow-up
CREATE OR REPLACE FUNCTION get_eligible_visitors(
  campaign_id_param UUID,
  property_id_param UUID DEFAULT NULL
)
RETURNS TABLE (
  visitor_id UUID,
  visitor_name TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  property_id UUID,
  property_name TEXT,
  property_address TEXT,
  visit_date TIMESTAMP WITH TIME ZONE,
  interested BOOLEAN,
  has_feedback BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id as visitor_id,
    v.name as visitor_name,
    v.email as visitor_email,
    v.phone as visitor_phone,
    v.property_id as property_id,
    p.name as property_name,
    p.address as property_address,
    v.visit_date,
    COALESCE(f.interested, false) as interested,
    (f.id IS NOT NULL) as has_feedback
  FROM visitors v
  LEFT JOIN properties p ON v.property_id = p.id
  LEFT JOIN feedback f ON v.id = f.visitor_id
  LEFT JOIN follow_up_campaigns c ON c.id = campaign_id_param
  LEFT JOIN unsubscribes u ON (
    (u.email = v.email AND u.unsubscribe_type IN ('email', 'both')) OR
    (u.phone = v.phone AND u.unsubscribe_type IN ('sms', 'both'))
  )
  WHERE 
    -- Property filter
    (property_id_param IS NULL OR v.property_id = property_id_param) AND
    -- Campaign property filter
    (c.property_id IS NULL OR v.property_id = c.property_id) AND
    -- Not unsubscribed
    u.id IS NULL AND
    -- Trigger condition filter
    CASE 
      WHEN c.trigger_condition = 'interested' THEN COALESCE(f.interested, false) = true
      WHEN c.trigger_condition = 'no_feedback' THEN f.id IS NULL
      WHEN c.trigger_condition = 'all' THEN true
      WHEN c.trigger_condition = 'manual' THEN true
      ELSE false
    END AND
    -- Not already sent this campaign
    NOT EXISTS (
      SELECT 1 FROM follow_up_logs fl 
      WHERE fl.visitor_id = v.id 
      AND fl.campaign_id = campaign_id_param
      AND fl.status NOT IN ('failed')
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON TABLE follow_up_campaigns IS 'Stores follow-up campaign configurations';
COMMENT ON TABLE follow_up_logs IS 'Tracks all sent follow-up messages and their delivery status';
COMMENT ON TABLE email_templates IS 'Reusable email templates with variable substitution';
COMMENT ON TABLE sms_templates IS 'Reusable SMS templates with variable substitution';
COMMENT ON TABLE unsubscribes IS 'Manages visitor unsubscribe preferences';
