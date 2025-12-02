# Production Setup Guide for Stripe Integration

Follow these steps to get Stripe working in production:

## Step 1: Set Environment Variables

Add these environment variables to your production hosting platform (Vercel, Netlify, etc.):

### Required Variables:

```env
# Stripe Production Keys (add your actual keys here)
STRIPE_SECRET_KEY=sk_live_...your_secret_key_here...

# Your Production Domain (replace with your actual domain)
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Supabase (if not already set)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Webhook Secret (Step 2 - you'll get this after setting up the webhook)

```env
STRIPE_WEBHOOK_SECRET=whsec_...  # You'll get this in Step 2
```

---

## Step 2: Set Up Stripe Webhook

The webhook is **critical** - it automatically upgrades users to premium after payment.

### 2.1. Go to Stripe Dashboard

1. Log in to [Stripe Dashboard](https://dashboard.stripe.com)
2. Make sure you're in **Live mode** (toggle in top right)
3. Navigate to **Developers → Webhooks**

### 2.2. Create Webhook Endpoint

1. Click **"Add endpoint"** button
2. **Endpoint URL**: Enter your production webhook URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
   ⚠️ Replace `yourdomain.com` with your actual domain

3. **Description** (optional): "SponsorFinder Premium Upgrade"

4. **Events to send**: Click "Select events" and choose:
   - `checkout.session.completed` ✅

5. Click **"Add endpoint"**

### 2.3. Copy Webhook Secret

1. After creating the endpoint, click on it to view details
2. Find **"Signing secret"** section
3. Click **"Reveal"** and copy the secret (starts with `whsec_`)
4. Add it to your environment variables:
   ```env
   STRIPE_WEBHOOK_SECRET=whsec_...paste_here...
   ```

---

## Step 3: Deploy Your Code

1. **Commit and push** your code to your repository
2. **Deploy** to your hosting platform (Vercel, Netlify, etc.)
3. Make sure all environment variables are set in your hosting platform's dashboard

---

## Step 4: Test the Integration

### 4.1. Test Checkout Flow

1. Go to your production site: `https://yourdomain.com/pricing`
2. Click **"Get Started"**
3. You should be redirected to Stripe Checkout
4. Use Stripe's test card: `4242 4242 4242 4242`
   - Expiry: Any future date
   - CVC: Any 3 digits
   - ZIP: Any 5 digits

### 4.2. Verify Webhook is Working

1. After completing test payment, check Stripe Dashboard:
   - Go to **Developers → Webhooks**
   - Click on your webhook endpoint
   - Check **"Recent events"** - you should see `checkout.session.completed`
   - Click on the event to see if it was successful (green checkmark)

2. Check your application logs:
   - Look for: `Premium access granted to user: [user-id]`

3. Verify user upgrade:
   - Log in to your app
   - Go to `/search` page
   - You should now see contact information (not blurred)

---

## Step 5: Monitor Webhooks (Important!)

### Check Webhook Status Regularly

- Go to **Stripe Dashboard → Developers → Webhooks**
- Check for failed webhook deliveries (red indicators)
- If webhooks fail, users won't get upgraded automatically

### Common Issues:

1. **Webhook secret not set**: Check environment variables
2. **Wrong URL**: Make sure webhook endpoint matches your production domain
3. **HTTPS required**: Webhooks only work over HTTPS in production
4. **Timeout**: Make sure your server responds quickly (< 5 seconds)

---

## Troubleshooting

### Payment succeeds but user doesn't get premium access

1. Check webhook logs in Stripe Dashboard
2. Verify `STRIPE_WEBHOOK_SECRET` is set correctly
3. Check your server logs for errors
4. Verify the user ID is being passed correctly in checkout session metadata

### Webhook returns 400/500 errors

1. Check webhook signature verification
2. Verify environment variables are set
3. Check Supabase connection (for updating user premium status)
4. Review server logs for specific error messages

### Checkout doesn't redirect

1. Verify `STRIPE_SECRET_KEY` is set
2. Check browser console for JavaScript errors
3. Verify API route `/api/create-checkout-session` is accessible

---

## Quick Checklist

- [ ] `STRIPE_SECRET_KEY` set in production environment
- [ ] `STRIPE_WEBHOOK_SECRET` set in production environment  
- [ ] `NEXT_PUBLIC_SITE_URL` set to production domain
- [ ] Webhook endpoint created in Stripe Dashboard
- [ ] Webhook endpoint URL matches: `https://yourdomain.com/api/webhooks/stripe`
- [ ] Webhook listening to `checkout.session.completed` event
- [ ] Code deployed to production
- [ ] Test payment completed successfully
- [ ] Webhook received and processed successfully
- [ ] User premium status updated in database

---

## Support

If you encounter issues:
1. Check Stripe Dashboard → Developers → Webhooks for error messages
2. Check your hosting platform's logs
3. Verify all environment variables are set correctly
4. Test with Stripe's test mode first if needed

