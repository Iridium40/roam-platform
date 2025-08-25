import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from "@supabase/supabase-js";

// Initialize Plaid client
const configuration = new Configuration({
  basePath: PlaidEnvironments[process.env.PLAID_ENV || 'sandbox'],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID!,
      'PLAID-SECRET': process.env.PLAID_SECRET!,
    },
  },
});

const plaidClient = new PlaidApi(configuration);

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
    const {
      action,
      userId,
      businessId,
      accessToken,
      accountId,
      publicToken,
    } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    switch (action) {
      case 'create_link_token': {
        if (!userId || !businessId) {
          return res.status(400).json({ error: 'User ID and Business ID are required' });
        }

        // Create link token for Plaid Link
        const linkTokenResponse = await plaidClient.linkTokenCreate({
          user: { client_user_id: userId },
          client_name: 'ROAM Platform',
          products: ['auth'],
          country_codes: ['US'],
          language: 'en',
          account_filters: {
            depository: {
              account_subtypes: ['checking', 'savings'],
            },
          },
          webhook: process.env.PLAID_WEBHOOK_URL,
        });

        // Store link token in database
        await supabase
          .from('plaid_link_tokens')
          .insert({
            user_id: userId,
            business_id: businessId,
            link_token: linkTokenResponse.data.link_token,
            expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
            created_at: new Date().toISOString(),
          });

        return res.status(200).json({
          success: true,
          linkToken: linkTokenResponse.data.link_token,
          expiration: linkTokenResponse.data.expiration,
        });
      }

      case 'exchange_public_token': {
        if (!publicToken || !userId || !businessId) {
          return res.status(400).json({ error: 'Public token, User ID, and Business ID are required' });
        }

        // Exchange public token for access token
        const exchangeResponse = await plaidClient.itemPublicTokenExchange({
          public_token: publicToken,
        });

        const accessToken = exchangeResponse.data.access_token;
        const itemId = exchangeResponse.data.item_id;

        // Get account information
        const accountsResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        // Store access token and account info in database
        await supabase
          .from('plaid_accounts')
          .insert({
            user_id: userId,
            business_id: businessId,
            plaid_item_id: itemId,
            plaid_access_token: accessToken,
            accounts: accountsResponse.data.accounts,
            created_at: new Date().toISOString(),
          });

        // Update business profile
        await supabase
          .from('business_profiles')
          .update({
            bank_connected: true,
            plaid_item_id: itemId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', businessId);

        // Update setup progress
        await supabase
          .from('business_setup_progress')
          .update({
            bank_connection_completed: true,
            current_step: 6, // Move to next step
            updated_at: new Date().toISOString(),
          })
          .eq('business_id', businessId);

        return res.status(200).json({
          success: true,
          accessToken,
          itemId,
          accounts: accountsResponse.data.accounts,
        });
      }

      case 'get_accounts': {
        if (!accessToken) {
          return res.status(400).json({ error: 'Access token is required' });
        }

        const accountsResponse = await plaidClient.accountsGet({
          access_token: accessToken,
        });

        return res.status(200).json({
          success: true,
          accounts: accountsResponse.data.accounts,
          item: accountsResponse.data.item,
        });
      }

      case 'get_auth': {
        if (!accessToken) {
          return res.status(400).json({ error: 'Access token is required' });
        }

        const authResponse = await plaidClient.authGet({
          access_token: accessToken,
        });

        return res.status(200).json({
          success: true,
          accounts: authResponse.data.accounts,
          numbers: authResponse.data.numbers,
        });
      }

      case 'create_processor_token': {
        if (!accessToken || !accountId) {
          return res.status(400).json({ error: 'Access token and account ID are required' });
        }

        // Create processor token for Stripe
        const processorTokenResponse = await plaidClient.processorTokenCreate({
          access_token: accessToken,
          account_id: accountId,
          processor: 'stripe',
        });

        return res.status(200).json({
          success: true,
          processorToken: processorTokenResponse.data.processor_token,
        });
      }

      case 'remove_item': {
        if (!accessToken) {
          return res.status(400).json({ error: 'Access token is required' });
        }

        // Remove Plaid item
        await plaidClient.itemRemove({
          access_token: accessToken,
        });

        // Update database
        await supabase
          .from('business_profiles')
          .update({
            bank_connected: false,
            plaid_item_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq('plaid_item_id', accessToken);

        await supabase
          .from('plaid_accounts')
          .delete()
          .eq('plaid_access_token', accessToken);

        return res.status(200).json({
          success: true,
          message: 'Bank connection removed successfully',
        });
      }

      default:
        return res.status(400).json({ error: `Unknown action: ${action}` });
    }
  } catch (error) {
    console.error('Plaid API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
