# Setting up Environment Variables for Edge Functions

To enable email sending with Resend in your Supabase Edge Functions, you need to add the RESEND_API_KEY as an environment variable in your Supabase project.

## Option 1: Using Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard/project/sgtlahgivdcftcktqrwp
2. Navigate to **Settings** → **Edge Functions**
3. In the "Environment Variables" section, click **Add variable**
4. Add:
   - **Name**: `RESEND_API_KEY`
   - **Value**: `re_MtcjJC2m_3KjJEsFkGCkUwAqDV4ewKW7N`
5. Click **Save**

## Option 2: Using Supabase CLI

If you have the Supabase CLI installed, you can run:

```bash
# Navigate to your project directory
cd openhouse-project

# Set the environment variable
supabase secrets set RESEND_API_KEY=re_MtcjJC2m_3KjJEsFkGCkUwAqDV4ewKW7N
```

## Verification

After setting the environment variable, you can test the follow-up system:

1. Create a campaign in the admin dashboard
2. Add some test visitors through the check-in form
3. Send a follow-up email through the campaign
4. Check the Message Logs to see if the email was sent successfully

## Important Notes

- Environment variables for Edge Functions are separate from your local .env.local file
- Changes to Edge Function environment variables may take a few minutes to propagate
- Make sure your Resend account is properly configured and your API key is valid

## Troubleshooting

If you're still getting errors after setting the environment variable:

1. Wait 2-3 minutes for the changes to propagate
2. Check the Supabase Edge Function logs in the dashboard
3. Verify your Resend API key is valid and has the necessary permissions
4. Ensure your "from" email domain is verified in Resend (if using a custom domain)
