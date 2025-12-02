# SponsorFinder

A Next.js micro-SaaS application that provides a directory of companies that sponsor YouTubers, with a paywall to access contact information.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Shadcn UI
- **Backend**: Supabase (PostgreSQL, Auth, Row Level Security)
- **Payments**: Stripe (Production)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the migration files **in order**:
   - Copy the contents of `supabase/migrations/001_initial_schema.sql` and execute
   - Copy the contents of `supabase/migrations/002_pending_premium_payments.sql` and execute
   - Copy the contents of `supabase/migrations/003_optimize_user_lookup.sql` and execute

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Required for webhook (find in Supabase Settings → API)

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_SITE_URL=http://localhost:3000  # Change to your production URL in production
```

**Important**: 
- You can find Supabase values in your Supabase project settings under API
- `SUPABASE_SERVICE_ROLE_KEY` is required for the webhook to process payments for unauthenticated users
- Without it, webhook will still work but will use a fallback method (slower)

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Schema

### Tables

- **brands**: Company information (name, category, website, logo)
- **contacts**: Contact information (email, name, role) - protected by RLS
- **users**: User profiles linked to Supabase Auth (includes premium status)

### Row Level Security (RLS)

- Brands are publicly viewable (if `is_active = true`)
- Contacts are only viewable by premium users
- Users can only view/update their own data

## Features

- **Landing Page** (`/`): Hero section with call-to-action
- **Search Page** (`/search`): Browse brands with category filters
- **Brand Cards**: Show contact info blurred for non-premium users
- **Authentication**: Login/Signup via Supabase Auth
- **Pricing Page** (`/pricing`): Stripe checkout integration
- **Premium Access**: Unlock contact information for premium users

## Data Scraper

The project includes a Python scraper (`scraper.py`) to collect sponsor data from YouTube channels.

### Setup

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables in `.env.local` (or `.env`):
```env
# Required
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # Recommended for bypassing RLS
# OR
SUPABASE_ANON_KEY=your_anon_key  # Alternative

# Optional (for better results)
SERPAPI_KEY=your_serpapi_key  # Get free API key at serpapi.com
HUNTER_API_KEY=your_hunter_api_key  # Get free API key at hunter.io (for enricher)
```

**Note**: 
- The script automatically loads variables from `.env.local` (or `.env` if that doesn't exist)
- Use `SUPABASE_SERVICE_ROLE_KEY` instead of `SUPABASE_ANON_KEY` to bypass Row Level Security (RLS) when inserting data. You can find this in your Supabase project settings under API.
- You can also set environment variables directly in your shell if preferred

### Usage

Run the scraper:
```bash
python scraper.py
```

The scraper will:
- Search Google for YouTube channels with "business inquiries" in multiple categories (gaming, tech, beauty, fitness, lifestyle, education)
- Extract channel names and email addresses from search results
- Save data to Supabase `brands` and `contacts` tables
- Automatically handle duplicates (won't insert the same brand twice)

### Search Methods

The scraper supports two methods:

1. **SerpApi** (Recommended): More reliable and less likely to be blocked
   - Requires: `SERPAPI_KEY` environment variable
   - Get free API key at [serpapi.com](https://serpapi.com)

2. **Requests + BeautifulSoup**: Basic web scraping
   - Free but may be rate-limited by Google
   - Includes delays between requests to be respectful

## Contact Enricher

The project includes a Python enricher (`enricher.py`) that upgrades brands from generic entries to specific human contacts using a waterfall method.

### Setup

1. Install Python dependencies (same as scraper):
```bash
pip install -r requirements.txt
```

2. Set environment variables in `.env.local` (or `.env`):
```env
# Required (same as scraper)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional but recommended
HUNTER_API_KEY=your_hunter_api_key  # Get free API key at https://hunter.io/api
```

### Usage

Run the enricher:
```bash
python enricher.py
```

The enricher will:
- Find all brands that have a `website_url` but no contacts yet
- Use a waterfall method to find contacts:
  1. **Hunter.io API** (Step A): Searches for people with roles like Marketing, Partnership, Sponsorship, PR, Director
  2. **Team Page Scraper** (Step B): Scrapes About/Team/Contact/Press pages for mailto links
  3. **Smart Guesser** (Step C): Generates generic department emails (partnerships@, marketing@, press@, creators@)
- Insert found contacts into the `contacts` table with name, role, and email
- Mark brands as checked to avoid re-processing
- Include polite delays (2 seconds) between requests

### Enrichment Strategy

The enricher uses a three-step waterfall approach:
- **Step A** (Hunter.io): Most accurate, finds real people with verified emails
- **Step B** (Scraper): Fallback when API fails or limits are reached, extracts from website pages
- **Step C** (Guesser): Last resort, creates generic department emails marked as "Department Generic"

## Stripe Integration

The app uses Stripe Checkout for payment processing. The pricing is set to **$27 for lifetime access**.

### Setup

1. **Add Stripe keys to your environment variables** (`.env.local`):
```env
STRIPE_SECRET_KEY=sk_live_...  # Your Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_...  # Webhook secret (get from Stripe Dashboard)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com  # Your production URL
```

2. **Set up Stripe Webhook**:
   - Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
   - Click "Add endpoint"
   - Set the endpoint URL to: `https://yourdomain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`
   - Copy the webhook signing secret and add it to `STRIPE_WEBHOOK_SECRET`

3. **How it works**:
   - Users click "Get Started" on the pricing page
   - A Stripe Checkout Session is created via `/api/create-checkout-session`
   - User is redirected to Stripe's hosted checkout page
   - After successful payment, Stripe sends a webhook to `/api/webhooks/stripe`
   - The webhook handler updates the user's `is_premium` status in the database

### Testing

For testing, use Stripe test mode keys (start with `sk_test_` and `pk_test_`). Test card numbers are available in the [Stripe documentation](https://stripe.com/docs/testing).

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── create-checkout-session/  # Stripe checkout session creation
│   │   └── webhooks/
│   │       └── stripe/               # Stripe webhook handler
│   ├── auth/
│   │   ├── login/          # Login/Signup page
│   │   └── logout/         # Logout route
│   ├── search/             # Search page with filters
│   ├── pricing/            # Pricing page ($27 lifetime access)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Landing page
│   └── globals.css         # Global styles
├── components/
│   ├── ui/                 # Shadcn UI components
│   ├── BrandCard.tsx       # Brand card with blur effect
│   └── CategoryFilter.tsx  # Category filter sidebar
├── lib/
│   ├── supabase/           # Supabase client helpers
│   └── utils.ts            # Utility functions
└── supabase/
    └── migrations/         # Database migrations
```

## Next Steps

1. Add seed data to populate brands and contacts
2. Add email verification flow
3. Implement search functionality
4. Add pagination for brand listings
5. Set up production environment variables and Stripe webhook endpoint

