# Local Development Guide

## Follow-up System Local Testing

The follow-up system is designed to work seamlessly in both local development and production environments.

### 🔧 Local Development Mode

When running locally (`NODE_ENV=development`) without external email/SMS service configuration, the system automatically enters **Simulation Mode**.

#### What happens in Simulation Mode:

1. **No External API Calls**: No actual emails or SMS messages are sent
2. **Database Logging**: All "sent" messages are logged to the `follow_up_logs` table
3. **Visual Feedback**: Success messages clearly indicate simulation mode
4. **Full Testing**: You can test the entire follow-up workflow without external services

#### Benefits:

- ✅ Test campaign creation and management
- ✅ Test visitor selection and targeting
- ✅ Test template variable replacement
- ✅ Test database logging and message history
- ✅ No need for email domain verification
- ✅ No need for SMS service setup

### 🚀 Production Setup

For production deployment, configure these environment variables:

#### Email Service (Resend)
```bash
RESEND_API_KEY=your_resend_api_key
```

#### SMS Service (Twilio)
```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### 📧 Testing the Follow-up System

1. **Create a Campaign**:
   - Go to Admin Dashboard → Follow-up Management
   - Click "Create Campaign"
   - Fill in campaign details with email/SMS templates
   - Use template variables like `{{visitor_name}}`, `{{property_name}}`

2. **Add Test Visitors**:
   - Use the visitor check-in form to add test visitors
   - Optionally submit feedback to test interest-based targeting

3. **Send Follow-ups**:
   - Select your campaign and click "Send"
   - Choose specific visitors or send to all eligible visitors
   - In local mode, you'll see a simulation success message

4. **Check Message Logs**:
   - Go to the "Message Logs" tab
   - See all simulated messages with full details
   - Verify template variables were replaced correctly

### 🔍 Troubleshooting

#### "Unauthorized" Error
- Make sure you're logged in as an admin
- Check that your admin account exists in the `admins` table
- Verify Supabase authentication is working

#### No Eligible Visitors
- Ensure you have visitors in the database
- Check campaign trigger conditions (interested vs all visitors)
- Verify property filtering if campaign is property-specific

#### Template Variables Not Working
- Use double curly braces: `{{variable_name}}`
- Check available variables in the campaign form helper
- Ensure visitor data exists for the variables you're using

### 📝 Available Template Variables

- `{{visitor_name}}` - Visitor's full name
- `{{visitor_email}}` - Visitor's email address
- `{{visitor_phone}}` - Visitor's phone number
- `{{property_name}}` - Property name
- `{{property_address}}` - Property address
- `{{admin_name}}` - Admin/agent name
- `{{admin_email}}` - Admin/agent email
- `{{visit_date}}` - Date of visit

### 🎯 Next Steps

Once you're ready for production:

1. Set up Resend account and verify your domain
2. Set up Twilio account for SMS capabilities
3. Add the production environment variables
4. Deploy to your hosting platform
5. Test with real email addresses and phone numbers

The system will automatically detect the production environment and switch from simulation mode to real message sending.
