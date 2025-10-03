# Stripe Webhook Local Testing Setup

## Problem
Stripe webhooks cannot reach localhost during development. When you complete checkout, Stripe's servers try to send a webhook to your endpoint, but can't access `http://localhost:3004/api/stripe/webhook`.

**Result:** Bookings are never created, so the success page can't find them.

---

## Solution 1: Use Stripe CLI (Recommended)

### Step 1: Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### Step 2: Login to Stripe
```bash
stripe login
```
This will open your browser to authenticate.

### Step 3: Forward Webhooks to Local Server
```bash
# Forward webhooks to your local dev server
stripe listen --forward-to localhost:3004/api/stripe/webhook
```

**Output will show:**
```
> Ready! Your webhook signing secret is whsec_xxxxx (^C to quit)
```

### Step 4: Copy the Webhook Secret
Copy the `whsec_xxxxx` value and add it to your `.env` file:

```env
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxxxx
```

### Step 5: Restart Your Dev Server
```bash
cd roam-customer-app
npm run dev
```

### Step 6: Test the Flow
1. Complete a booking and checkout
2. Use test card: `4242 4242 4242 4242`
3. Watch the Stripe CLI terminal - you'll see webhook events
4. Your dev server will create the booking
5. Success page will display the booking

---

## Solution 2: Use Vercel/Ngrok for Public URL (Alternative)

If Stripe CLI doesn't work, you can expose your local server:

### Option A: Ngrok
```bash
# Install ngrok
brew install ngrok/ngrok/ngrok

# Start ngrok
ngrok http 3004

# Copy the forwarding URL (e.g., https://abc123.ngrok.io)
# Add to Stripe Dashboard → Webhooks:
# https://abc123.ngrok.io/api/stripe/webhook
```

### Option B: Deploy to Vercel
Deploy your API to Vercel and use the production webhook endpoint for testing.

---

## Current Error Explained

```
Error: The result contains 0 rows
```

**What's happening:**
1. ✅ User completes checkout on Stripe
2. ❌ Webhook can't reach localhost:3004
3. ❌ Booking is never created in database
4. ❌ Success page queries for booking → Not found
5. ❌ Error: "0 rows returned"

**After Fix:**
1. ✅ User completes checkout on Stripe
2. ✅ Stripe CLI forwards webhook to localhost:3004
3. ✅ Webhook creates booking + transactions
4. ✅ Success page finds booking
5. ✅ Displays confirmation

---

## Quick Start Commands

```bash
# Terminal 1: Start Stripe webhook forwarding
stripe listen --forward-to localhost:3004/api/stripe/webhook

# Terminal 2: Start dev server (in roam-customer-app/)
npm run dev

# Terminal 3: (Optional) Watch logs
tail -f /path/to/logs
```

---

## Testing Checklist

After setting up Stripe CLI:

1. ✅ Stripe CLI shows "Ready! Listening for events..."
2. ✅ Dev server running on localhost:5174
3. ✅ Complete a test booking
4. ✅ Stripe CLI shows `checkout.session.completed` event
5. ✅ Dev server logs show "✅ Booking created successfully"
6. ✅ Success page displays booking details

---

## Webhook Events to Watch For

The Stripe CLI will show these events:
- `checkout.session.completed` - Main event (creates booking)
- `payment_intent.succeeded` - Payment succeeded
- `charge.succeeded` - Charge completed

Your webhook handler processes all three and creates:
- Booking record
- Payment transaction
- Financial transaction
- Business payment transaction

---

## Environment Variables Needed

Make sure your `.env` has:
```env
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_...
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SIGNING_SECRET=whsec_...  # From Stripe CLI

# Supabase
VITE_PUBLIC_SUPABASE_URL=https://...supabase.co
SUPABASE_SERVICE_ROLE_KEY=...

# App URL
VITE_APP_URL=http://localhost:5174
```

---

## Troubleshooting

### Issue: Stripe CLI not forwarding
**Check:**
```bash
# Test webhook endpoint is accessible
curl -X POST http://localhost:3004/api/stripe/webhook

# Should return: {"error":"Missing Stripe signature"}
```

### Issue: Webhook signature verification fails
**Fix:** Make sure `STRIPE_WEBHOOK_SIGNING_SECRET` matches the value from `stripe listen`

### Issue: Booking still not created
**Check dev server logs for:**
- "Processing webhook event: checkout.session.completed"
- "✅ Booking created successfully: [booking-id]"
- Any error messages

### Issue: Can't install Stripe CLI
**Alternative:** Use ngrok or test with deployed environment

---

## Production Setup

For production, you'll configure webhooks in Stripe Dashboard:
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. URL: `https://your-domain.com/api/stripe/webhook`
4. Events: Select `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
5. Copy webhook signing secret to production env vars

---

**Next Step:** Install and run Stripe CLI to test locally!
