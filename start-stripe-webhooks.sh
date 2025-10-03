#!/bin/bash

# Quick Stripe Webhook Setup and Test
# Run this script to set up and test Stripe webhooks locally

echo "🔍 Checking Stripe CLI setup..."
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found"
    echo "Installing..."
    brew install stripe/stripe-cli/stripe
else
    echo "✅ Stripe CLI installed: $(stripe version)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 NEXT STEPS TO FIX YOUR ISSUE:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Your bookings aren't being created because Stripe webhooks"
echo "can't reach localhost. Here's how to fix it:"
echo ""
echo "1️⃣  OPEN A NEW TERMINAL and run:"
echo "    stripe login"
echo ""
echo "2️⃣  Then in the SAME terminal, run:"
echo "    stripe listen --forward-to localhost:3004/api/stripe/webhook"
echo ""
echo "3️⃣  Copy the webhook secret from the output:"
echo "    > Ready! Your webhook signing secret is whsec_xxxxx"
echo ""
echo "4️⃣  Update your .env file (in roam-customer-app/):"
echo "    STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxxxx"
echo ""
echo "5️⃣  Restart your dev server (in another terminal):"
echo "    cd roam-customer-app"
echo "    npm run dev"
echo ""
echo "6️⃣  Test the booking flow again!"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 TIP: Keep the 'stripe listen' command running"
echo "   in a separate terminal while testing."
echo ""
echo "📖 For detailed instructions, see:"
echo "   TESTING_STRIPE_LOCALLY.md"
echo ""
