# Follow-up System Setup Guide

## 🚀 Quick Setup Instructions

### 1. Database Setup
Run the following SQL script in your Supabase SQL Editor:
```bash
# Copy and paste the contents of database-followup-system.sql into Supabase SQL Editor
```

### 2. Deploy Supabase Edge Function
```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref sgtlahgivdcftcktqrwp

# Deploy the follow-up function
supabase functions deploy send-follow-up
```

### 3. Environment Variables
✅ **Resend API Key**: Already configured in `.env.local`
- `RESEND_API_KEY=re_MtcjJC2m_3KjJEsFkGCkUwAqDV4ewKW7N`

🔧 **Optional - Twilio SMS Setup** (uncomment in `.env.local` when ready):
- `TWILIO_ACCOUNT_SID=your-twilio-account-sid`
- `TWILIO_AUTH_TOKEN=your-twilio-auth-token`
- `TWILIO_PHONE_NUMBER=your-twilio-phone-number`

### 4. Verify Domain for Resend
1. Go to [Resend Dashboard](https://resend.com/domains)
2. Add your domain (e.g., `yourdomain.com`)
3. Update the Edge Function to use your verified domain:
   - Edit `supabase/functions/send-follow-up/index.ts`
   - Change `noreply@yourdomain.com` to your verified domain

## 📧 Testing the System

### 1. Create a Test Campaign
1. Go to Admin Dashboard → Follow-up tab
2. Click "Create Campaign"
3. Fill in campaign details:
   - **Name**: "Welcome Test"
   - **Message Type**: "Email Only"
   - **Trigger**: "Manual Send"
   - **Email Subject**: "Welcome to {{property_name}}!"
   - **Email Template**: "Hi {{visitor_name}}, thanks for visiting!"

### 2. Test Email Sending
1. Ensure you have some test visitors in your database
2. Click "Send" on your test campaign
3. Select test visitors and send
4. Check email delivery in Resend dashboard

## 🎯 Features Available

### ✅ Email Campaigns
- Custom email templates with variables
- HTML and text content support
- Delivery tracking via Resend

### ✅ Campaign Management
- Create, edit, pause, and activate campaigns
- Target specific visitor segments
- Manual and automated sending

### ✅ Analytics & Tracking
- Message delivery status
- Campaign performance metrics
- Detailed message logs

### 🔄 SMS Campaigns (Optional)
- Requires Twilio account setup
- SMS templates with character limits
- Combined email + SMS campaigns

## 🛡️ Security Features

- Row Level Security (RLS) policies
- Admin-only access controls
- Unsubscribe management
- GDPR-compliant data handling

## 📊 Template Variables Available

Use these variables in your email and SMS templates:
- `{{visitor_name}}` - Visitor's full name
- `{{visitor_email}}` - Visitor's email address
- `{{visitor_phone}}` - Visitor's phone number
- `{{property_name}}` - Property name
- `{{property_address}}` - Property address
- `{{admin_name}}` - Admin/agent name
- `{{admin_email}}` - Admin/agent email
- `{{admin_phone}}` - Admin/agent phone
- `{{visit_date}}` - Date of visit
- `{{interested}}` - Whether visitor was interested

## 🚨 Troubleshooting

### Email Not Sending
1. Check Resend API key in environment variables
2. Verify domain is added and verified in Resend
3. Check Supabase Edge Function logs
4. Ensure follow-up logs table shows "sent" status

### Function Deployment Issues
1. Ensure Supabase CLI is installed and logged in
2. Check project is linked correctly
3. Verify function code has no syntax errors
4. Check Supabase function logs for errors

### Database Errors
1. Ensure all SQL scripts have been run
2. Check RLS policies are enabled
3. Verify admin user exists in admins table
4. Check foreign key relationships

## 📞 Support

If you encounter issues:
1. Check the browser console for JavaScript errors
2. Review Supabase function logs
3. Verify all environment variables are set
4. Test with a simple campaign first

The follow-up system is now ready to help you engage with your open house visitors effectively! 🎉
