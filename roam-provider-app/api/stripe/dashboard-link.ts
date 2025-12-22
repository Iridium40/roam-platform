import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia' as any,
});

const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(
  supabaseUrl!,
  supabaseServiceKey!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { business_id } = req.body;

    if (!business_id) {
      return res.status(400).json({ error: 'Business ID required' });
    }

    // Get Stripe Connect account for this business
    const { data: connectAccount, error: connectError } = await supabase
      .from('stripe_connect_accounts')
      .select('account_id, charges_enabled, payouts_enabled')
      .eq('business_id', business_id)
      .single();

    if (connectError || !connectAccount) {
      console.error('Stripe Connect account not found:', { business_id, error: connectError });
      return res.status(404).json({ error: 'Stripe Connect account not found for this business' });
    }

    const stripeAccountId = connectAccount.account_id;

    if (!stripeAccountId) {
      return res.status(400).json({ error: 'Stripe account not connected' });
    }

    try {
      // Retrieve account to verify it exists and get account type
      const account = await stripe.accounts.retrieve(stripeAccountId);
      
      console.log('Stripe account retrieved:', {
        id: account.id,
        type: account.type,
        detailsSubmitted: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });

      // For Standard accounts, redirect to the main Stripe dashboard
      if (account.type === 'standard') {
        return res.json({
          url: 'https://dashboard.stripe.com/',
          accountType: 'standard',
          message: 'Standard accounts use the main Stripe dashboard',
        });
      }

      // For Express/Custom accounts, try to create a login link
      // This only works if the account has completed onboarding (details_submitted = true)
      if (account.details_submitted) {
        try {
          const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
          return res.json({
            url: loginLink.url,
            created: loginLink.created,
            accountType: account.type,
          });
        } catch (loginLinkError: any) {
          console.error('Login link creation failed:', loginLinkError.message);
          // Fall through to account link below
        }
      }

      // If login link fails or account hasn't completed onboarding,
      // create an account link to continue/complete onboarding
      console.log('Creating account link for onboarding completion...');
      const baseUrl = process.env.VITE_PUBLIC_APP_URL || 'https://www.roamprovider.com';
      
      const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${baseUrl}/dashboard?tab=financials&stripe_refresh=true`,
        return_url: `${baseUrl}/dashboard?tab=financials&stripe_success=true`,
        type: 'account_onboarding',
        collect: 'eventually_due',
      });

      return res.json({
        url: accountLink.url,
        accountType: account.type,
        requiresOnboarding: !account.details_submitted,
        message: account.details_submitted 
          ? 'Redirecting to Stripe dashboard...'
          : 'Please complete your Stripe account setup',
      });

    } catch (stripeError: any) {
      console.error('Stripe API error:', stripeError);
      
      // If all else fails, provide a generic Stripe dashboard link
      if (stripeError.type === 'StripeInvalidRequestError') {
        return res.status(400).json({ 
          error: 'Unable to create dashboard access link',
          details: stripeError.message,
          fallbackUrl: 'https://dashboard.stripe.com/',
        });
      }
      
      throw stripeError;
    }

  } catch (error: any) {
    console.error('Error creating dashboard link:', error);
    return res.status(500).json({ 
      error: 'Failed to create dashboard link',
      details: error.message 
    });
  }
}

