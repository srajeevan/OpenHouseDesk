# Vercel Deployment Guide for Open House Webapp

## 🚀 Complete Deployment Instructions

### Prerequisites
- ✅ Supabase project configured
- ✅ Custom domain ready
- ✅ GitHub/GitLab repository
- ✅ Vercel account

## Step 1: Repository Setup

### 1.1 Initialize Git (if not done)
```bash
cd openhouse-project
git init
git add .
git commit -m "Initial commit - Open House webapp"
```

### 1.2 Push to GitHub
```bash
# Create repository on GitHub first, then:
git remote add origin https://github.com/yourusername/openhouse-project.git
git branch -M main
git push -u origin main
```

## Step 2: Vercel Deployment

### 2.1 Connect Repository
1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Select "openhouse-project" folder as root directory

### 2.2 Configure Build Settings
- **Framework Preset**: Next.js
- **Root Directory**: `./openhouse-project`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm install`

### 2.3 Environment Variables
Add these in Vercel Dashboard → Settings → Environment Variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://sgtlahgivdcftcktqrwp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndGxhaGdpdmRjZnRja3RxcndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4NDk2MTUsImV4cCI6MjA2NTQyNTYxNX0.oEWIRAeneoGjtSuUUEs7pHsBpAEV4xquwTN3JYsxkgk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNndGxhaGdpdmRjZnRja3RxcndwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTg0OTYxNSwiZXhwIjoyMDY1NDI1NjE1fQ.XCzOKGTKw5F8WfRTVrRWieAndeYb9lC-0bSNwEv8u-Y

# Email Service
RESEND_API_KEY=re_MtcjJC2m_3KjJEsFkGCkUwAqDV4ewKW7N

# Admin Configuration (Optional)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=your-admin-password-here

# SMS Service (Add when ready)
# TWILIO_ACCOUNT_SID=your-twilio-account-sid
# TWILIO_AUTH_TOKEN=your-twilio-auth-token
# TWILIO_PHONE_NUMBER=your-twilio-phone-number
```

## Step 3: Custom Domain Configuration

### 3.1 Add Domain in Vercel
1. Go to Project → Settings → Domains
2. Add your custom domain (e.g., `yourdomain.com`)
3. Configure DNS records as instructed by Vercel

### 3.2 DNS Configuration
Add these records to your domain provider:

**For Apex Domain (yourdomain.com):**
```
Type: A
Name: @
Value: 76.76.19.61
```

**For WWW Subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3.3 SSL Certificate
- Vercel automatically provisions SSL certificates
- Wait 24-48 hours for full propagation

## Step 4: Supabase Configuration Updates

### 4.1 Update Authentication URLs
In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://yourdomain.com
```

**Redirect URLs:**
```
https://yourdomain.com/admin/dashboard
https://yourdomain.com/auth/callback
https://yourdomain.com/admin/login
```

### 4.2 Update CORS Settings
In Supabase Dashboard → Settings → API:
Add your domain to allowed origins:
```
https://yourdomain.com
https://www.yourdomain.com
```

## Step 5: Database Setup Verification

### 5.1 Run Database Scripts
Ensure these scripts have been executed in Supabase SQL Editor:
1. `database-setup.sql` - Core tables
2. `database-properties-setup.sql` - Properties functionality
3. `database-followup-system.sql` - Follow-up system

### 5.2 Verify RLS Policies
Check that Row Level Security is properly configured for:
- `visitors` table
- `feedback` table
- `properties` table
- `admins` table
- `followups` table

## Step 6: Edge Functions Deployment (Optional)

### 6.1 Deploy Supabase Functions
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy functions
supabase functions deploy send-follow-up
```

### 6.2 Set Function Environment Variables
In Supabase Dashboard → Edge Functions → send-follow-up:
```env
RESEND_API_KEY=your-resend-api-key
```

## Step 7: Testing Deployment

### 7.1 Functionality Tests
Test these features on your live domain:

**Public Features:**
- [ ] Visitor check-in form
- [ ] Feedback submission
- [ ] Thank you pages
- [ ] QR code scanning

**Admin Features:**
- [ ] Admin login
- [ ] Dashboard access
- [ ] Property management
- [ ] Visitor data viewing
- [ ] CSV export
- [ ] Follow-up management

**Email/SMS:**
- [ ] Follow-up email notifications
- [ ] Admin notifications

### 7.2 Performance Tests
- [ ] Page load speeds
- [ ] Mobile responsiveness
- [ ] Form submissions
- [ ] Database queries

## Step 8: Production Optimizations

### 8.1 Vercel Analytics
Enable in Project Settings → Analytics

### 8.2 Performance Monitoring
- Enable Web Vitals tracking
- Set up error monitoring
- Configure uptime monitoring

### 8.3 Security Headers
Add to `next.config.ts`:
```typescript
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

## Troubleshooting

### Common Issues

**Build Failures:**
- Check TypeScript errors
- Verify all dependencies are installed
- Ensure environment variables are set

**Authentication Issues:**
- Verify Supabase redirect URLs
- Check CORS settings
- Confirm environment variables

**Database Connection:**
- Verify Supabase keys
- Check RLS policies
- Confirm table existence

**Email/SMS Not Working:**
- Verify API keys
- Check service configurations
- Test in development first

## Post-Deployment Checklist

- [ ] All functionality tested
- [ ] Custom domain working
- [ ] SSL certificate active
- [ ] Analytics configured
- [ ] Error monitoring set up
- [ ] Backup strategy in place
- [ ] Documentation updated

## Support

For issues:
1. Check Vercel deployment logs
2. Review Supabase logs
3. Test locally first
4. Check environment variables
5. Verify DNS propagation

Your Open House webapp should now be live at your custom domain with full functionality!
