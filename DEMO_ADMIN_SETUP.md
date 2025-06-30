# 🔑 Demo Admin Account Setup Guide

This guide will help you create a demo admin account that realtors can use to test the Open House webapp without any subscription requirements.

## 📋 Demo Admin Credentials

**Email:** `admin@openhousedesk.com`  
**Password:** `890712`

## 🚀 Setup Steps

### Step 1: Create User in Supabase Auth

1. **Go to your Supabase Dashboard**
   - Navigate to `Authentication` → `Users`
   - Click `Add user` or `Invite user`

2. **Create the user with these details:**
   ```
   Email: admin@openhousedesk.com
   Password: 890712
   Email Confirm: true (check this box)
   ```

3. **Copy the User ID**
   - After creating the user, copy the `User ID` (UUID format)
   - You'll need this for the next step

### Step 2: Add Admin Record to Database

1. **Go to Supabase SQL Editor**
   - Navigate to `SQL Editor` in your Supabase dashboard

2. **Run the following SQL** (replace `USER_ID_FROM_STEP_1` with the actual User ID):

```sql
-- Insert demo admin record
INSERT INTO admins (
  id,
  user_id,
  first_name,
  last_name,
  email,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'USER_ID_FROM_STEP_1', -- Replace with actual User ID from Supabase Auth
  'Demo',
  'Admin',
  'admin@openhousedesk.com',
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Verify the admin was created
SELECT * FROM admins WHERE email = 'admin@openhousedesk.com';
```

### Step 3: Test the Login

1. **Go to your deployed app's admin login page:**
   - `https://yourdomain.com/admin/login`

2. **Login with:**
   - Email: `admin@openhousedesk.com`
   - Password: `890712`

3. **Verify access to:**
   - Admin dashboard
   - Property management
   - Visitor analytics
   - Follow-up system

## 🎯 What Realtors Can Test

With this demo admin account, realtors can:

### ✅ Property Management
- Add new properties
- Edit property details
- Generate QR codes for check-ins
- Activate/deactivate properties
- View property analytics

### ✅ Visitor Management
- View all visitor check-ins
- Filter visitors by property, date, interest level
- Export visitor data to CSV
- View detailed visitor feedback

### ✅ Analytics & Insights
- Total visitors count
- Feedback completion rates
- Average property ratings
- Interest level tracking
- Property performance comparison

### ✅ Follow-up System
- Create email campaigns
- Send follow-up messages
- Track message delivery
- Manage follow-up templates

### ✅ QR Code Generation
- Generate property-specific QR codes
- Download QR codes for printing
- Test check-in flow with QR codes

## 📱 Complete Testing Flow

### For Realtors to Test:

1. **Login as Admin**
   - Use `admin@openhousedesk.com` / `890712`

2. **Add a Test Property**
   - Go to Properties tab
   - Add a sample property with details

3. **Generate QR Code**
   - Click QR code button for the property
   - Download and test scanning

4. **Test Visitor Check-in**
   - Open check-in link or scan QR code
   - Fill out visitor form
   - Submit feedback

5. **View Results in Dashboard**
   - See visitor data appear
   - Check analytics update
   - Test CSV export

6. **Test Follow-up System**
   - Create a follow-up campaign
   - Send test messages
   - View delivery logs

## 🔒 Security Notes

- This is a **demo account** for testing purposes
- In production, each realtor should have their own account
- The demo account has full admin privileges
- Consider adding usage limits for demo accounts if needed

## 🚀 Production Deployment

When deploying to production:

1. **Set Environment Variables in Vercel:**
   ```
   ADMIN_EMAIL=admin@openhousedesk.com
   ADMIN_PASSWORD=890712
   ```

2. **Create the user in your production Supabase instance**

3. **Run the SQL script in your production database**

4. **Test the complete flow in production**

## 📞 Support

If realtors encounter any issues:

1. **Check Supabase logs** for authentication errors
2. **Verify the admin record** exists in the database
3. **Ensure environment variables** are set correctly
4. **Test the complete user flow** from check-in to dashboard

## 🎉 Ready for Realtor Testing!

Your Open House webapp now has a fully functional demo admin account that realtors can use to:
- Test all features without restrictions
- Experience the complete workflow
- Evaluate the system for their needs
- See real-time analytics and reporting

**Demo Login URL:** `https://yourdomain.com/admin/login`  
**Credentials:** `admin@openhousedesk.com` / `890712`
