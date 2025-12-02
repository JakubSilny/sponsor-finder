# Deployment Checklist

## ✅ Before Pushing to Production

### 1. Database Migrations
Run these migrations in Supabase SQL Editor **in order**:
- [ ] `supabase/migrations/001_initial_schema.sql` (should already be done)
- [ ] `supabase/migrations/002_pending_premium_payments.sql` (NEW - required)
- [ ] `supabase/migrations/003_optimize_user_lookup.sql` (NEW - recommended for performance)

**Note**: Migration 003 is optional but highly recommended. Without it, webhook will use fallback method (slower but still works).

### 2. Environment Variables
Make sure these are set in your production environment (Vercel, Netlify, etc.):

**Required:**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **NEW - Required for webhook**
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_WEBHOOK_SECRET`
- [ ] `NEXT_PUBLIC_SITE_URL` (your production domain)

### 3. Code Changes Summary
All changes are **backward compatible** and safe to push:

✅ **New Files:**
- `components/Navbar.tsx` - Shared navigation component
- `lib/supabase/admin.ts` - Admin client for webhook
- `app/api/activate-pending-premium/route.ts` - API for activating premium on login
- `supabase/migrations/002_pending_premium_payments.sql` - Pending payments table
- `supabase/migrations/003_optimize_user_lookup.sql` - Performance optimization

✅ **Updated Files:**
- `app/api/webhooks/stripe/route.ts` - Optimized webhook with fallback
- `app/search/page.tsx` - Parallel queries for better performance
- `app/pricing/page.tsx` - Better UX with auto-redirect
- `app/page.tsx` - Uses shared Navbar
- `components/BrandCard.tsx` - Uses router.refresh() instead of reload
- `app/auth/login/page.tsx` - Auto-activates pending premium
- `app/auth/logout/route.ts` - Better cookie cleanup

### 4. Testing Checklist

After deployment, test:

- [ ] **Homepage** - Shows correct login/logout state
- [ ] **Search page** - Loads brands correctly
- [ ] **Pricing page** - "Get Started" button works
- [ ] **Payment flow** (test mode):
  - [ ] Logged in user can pay → Premium activated immediately
  - [ ] Unauthenticated user can pay → Payment stored, activates on login
- [ ] **Login flow**:
  - [ ] User with pending payment → Premium activated on login
  - [ ] User without pending payment → Normal login
- [ ] **Webhook** - Check Stripe Dashboard → Webhooks → Recent events (should be successful)

### 5. Rollback Plan

If something goes wrong:
1. All changes are backward compatible
2. Webhook has fallback - will work even without migration 003
3. If migration 002 fails, webhook will still process logged-in users
4. Can revert to previous commit if needed

## 🚀 Ready to Deploy?

If all checkboxes above are checked, you're good to push! 

```bash
git add .
git commit -m "feat: optimize webhook, add pending payments, improve UX"
git push
```

Then:
1. Deploy to your hosting platform
2. Run migrations in Supabase (if not done)
3. Set environment variables
4. Test the payment flow

