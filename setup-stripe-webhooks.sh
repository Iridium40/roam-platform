#!/bin/bash

# Stripe Webhook Local Development Setup Script
# This script sets up Stripe webhook forwarding for local development

echo "🔧 Setting up Stripe webhooks for local development..."
echo ""

# Check if Stripe CLI is installed
if ! command -v stripe &> /dev/null; then
    echo "❌ Stripe CLI not found. Installing..."
    brew install stripe/stripe-cli/stripe
    echo "✅ Stripe CLI installed!"
else
    echo "✅ Stripe CLI already installed ($(stripe version))"
fi

echo ""
echo "📝 Next steps:"
echo ""
echo "1. Login to Stripe (this will open your browser):"
echo "   stripe login"
echo ""
echo "2. Start webhook forwarding (keep this running in a terminal):"
echo "   stripe listen --forward-to localhost:3004/api/stripe/webhook"
echo ""
echo "3. Copy the webhook signing secret from the output:"
echo "   > Ready! Your webhook signing secret is whsec_xxxxx"
echo ""
echo "4. Add it to your .env file in roam-customer-app/:"
echo "   STRIPE_WEBHOOK_SIGNING_SECRET=whsec_xxxxx"
echo ""
echo "5. Restart your dev server:"
echo "   cd roam-customer-app && npm run dev"
echo ""
echo "6. Test the booking flow! 🎉"
echo ""
echo "💡 Tip: Keep the 'stripe listen' command running in a separate terminal"
echo "   while testing to receive webhooks."
echo ""
