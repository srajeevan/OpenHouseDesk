# Open House Check-In System

A modern visitor management system for real estate open houses built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

- **Visitor Check-In**: Simple form for visitors to register their attendance
- **Feedback Collection**: Star rating system with comments and interest tracking
- **Admin Dashboard**: View and manage visitor data (coming soon)
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Real-time Database**: Powered by Supabase PostgreSQL
- **Form Validation**: Client and server-side validation with Zod
- **Toast Notifications**: User-friendly feedback with react-hot-toast

## Tech Stack

- **Frontend**: Next.js 14 with App Router, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Forms**: React Hook Form with Zod validation
- **UI**: Custom components with Tailwind CSS
- **Deployment**: Ready for Vercel/Netlify

## Quick Start

### 1. Prerequisites

- Node.js 18+ installed
- A Supabase account and project

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd openhouse-project
npm install
```

### 3. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Settings > API to get your project URL and anon key
3. Go to the SQL Editor and run the contents of `database-setup.sql`

### 4. Environment Configuration

Copy the `.env.local` file and update with your Supabase credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Demo Admin Configuration (for realtors to test)
ADMIN_EMAIL=admin@openhousedesk.com
ADMIN_PASSWORD=890712
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 🔑 Demo Admin Account

For realtors and users to test the system, a demo admin account is pre-configured:

**Login URL:** `https://yourdomain.com/admin/login`  
**Email:** `admin@openhousedesk.com`  
**Password:** `890712`

### What You Can Test:
- ✅ **Property Management** - Add, edit, and manage properties
- ✅ **QR Code Generation** - Create property-specific QR codes for check-ins
- ✅ **Visitor Analytics** - View real-time visitor data and feedback
- ✅ **Follow-up System** - Create and send email campaigns
- ✅ **CSV Export** - Export visitor data for analysis
- ✅ **Complete Workflow** - Test the entire visitor journey

### Setup Instructions:
See **[DEMO_ADMIN_SETUP.md](DEMO_ADMIN_SETUP.md)** for detailed setup instructions.

## Database Schema

The application uses three main tables:

### `visitors`
- `id` (UUID, Primary Key)
- `name` (Text, Required)
- `email` (Text, Required)
- `phone` (Text, Required)
- `visit_date` (Timestamp, Auto-generated)
- `created_at` (Timestamp, Auto-generated)

### `feedback`
- `id` (UUID, Primary Key)
- `visitor_id` (UUID, Foreign Key to visitors)
- `rating` (Integer, 1-5, Required)
- `comments` (Text, Optional)
- `interested` (Boolean, Default: false)
- `created_at` (Timestamp, Auto-generated)

### `followups`
- `id` (UUID, Primary Key)
- `visitor_id` (UUID, Foreign Key to visitors)
- `last_followed_up` (Timestamp, Auto-generated)
- `notes` (Text, Optional)
- `created_at` (Timestamp, Auto-generated)

## Application Flow

1. **Check-In**: Visitors fill out the check-in form on the homepage
2. **Thank You**: After successful check-in, visitors see a thank you page
3. **Feedback**: Visitors can optionally provide feedback via a star rating system
4. **Admin Dashboard**: Admins can view visitor data and manage follow-ups (coming soon)

## Project Structure

```
openhouse-project/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── feedback/          # Feedback collection pages
│   │   ├── thank-you/         # Thank you page after check-in
│   │   ├── layout.tsx         # Root layout with Toaster
│   │   └── page.tsx           # Homepage with check-in form
│   ├── components/            # Reusable React components
│   │   └── CheckInForm.tsx    # Main check-in form component
│   └── lib/                   # Utility functions and configurations
│       ├── supabase.ts        # Supabase client configuration
│       ├── validations.ts     # Zod schemas for form validation
│       └── utils.ts           # Helper functions
├── database-setup.sql         # Database schema and setup script
└── README.md                  # This file
```

## Key Components

### CheckInForm
The main visitor check-in form with validation and Supabase integration.

### FeedbackForm
Star rating system with comments and interest tracking.

### Supabase Client
Configured for both client-side and server-side operations with proper TypeScript types.

## Customization

### Styling
The application uses Tailwind CSS for styling. You can customize the design by:
- Modifying the color scheme in the component files
- Updating the gradient backgrounds
- Customizing the form layouts

### Validation
Form validation is handled by Zod schemas in `src/lib/validations.ts`. You can:
- Add new validation rules
- Modify existing field requirements
- Add new form fields

### Database
The database schema can be extended by:
- Adding new tables in the SQL setup script
- Creating new Supabase policies for security
- Adding indexes for performance

## Deployment

### Quick Deployment with Vercel

This project is optimized for Vercel deployment with custom domain support.

#### Automated Deployment Script
```bash
# Run the deployment preparation script
./deploy.sh
```

#### Manual Deployment Steps

1. **Prepare for Deployment**
   ```bash
   npm run build  # Test the build
   ```

2. **Push to Repository**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

3. **Deploy to Vercel**
   - Connect your GitHub repository to Vercel
   - Configure environment variables (see `.env.production.template`)
   - Set up your custom domain
   - Update Supabase authentication URLs

#### Deployment Resources

- 📚 **[Complete Deployment Guide](DEPLOYMENT_GUIDE.md)** - Step-by-step instructions
- 📋 **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Track your deployment progress
- 🔧 **[Environment Template](.env.production.template)** - Production environment variables

#### Custom Domain Setup

1. Add your domain in Vercel dashboard
2. Configure DNS records:
   - A record: `@` → `76.76.19.61`
   - CNAME record: `www` → `cname.vercel-dns.com`
3. Update Supabase authentication URLs
4. Wait for SSL certificate provisioning

#### Production Optimizations

- ✅ Security headers configured
- ✅ Performance optimizations enabled
- ✅ Image optimization with WebP/AVIF
- ✅ Bundle optimization for Supabase and forms
- ✅ Compression enabled
- ✅ SEO-friendly redirects and rewrites

## Security

The application implements Row Level Security (RLS) with Supabase:
- Anonymous users can insert visitor and feedback data
- Authenticated users (admins) can read all data
- All tables have appropriate security policies

## Future Enhancements

- [ ] Admin dashboard for visitor management
- [ ] CSV export functionality
- [ ] Email notifications for follow-ups
- [ ] Advanced filtering and search
- [ ] Analytics and reporting
- [ ] Multi-property support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For questions or issues, please open an issue on GitHub or contact the development team.
