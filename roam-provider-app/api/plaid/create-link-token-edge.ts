import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';
import { createClient } from '@supabase/supabase-js';

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
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = {
  runtime: 'edge',
};

export default async function handler(request: Request) {
  // Handle CORS
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    console.log('🔗 Creating Plaid link token via Edge Function');
    
    const body = await request.json();
    const { userId, businessId, businessType, products, country_codes, account_filters } = body;

    // Validate required fields
    if (!userId || !businessId) {
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: userId, businessId' 
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Get user information for Plaid
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ 
        error: 'User not found' 
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Create Plaid link token
    const linkTokenRequest = {
      user: {
        client_user_id: userId,
      },
      client_name: 'ROAM Partner Portal',
      products: products || ['auth'],
      country_codes: country_codes || ['US'],
      language: 'en',
      webhook: `${process.env.VITE_APP_URL || 'https://roamservices.app'}/api/plaid/webhook`,
      account_filters: account_filters || {
        depository: {
          account_subtypes: ['checking', 'savings'],
        },
      },
    };

    console.log('🔗 Plaid link token request:', linkTokenRequest);

    const response = await plaidClient.linkTokenCreate(linkTokenRequest);
    
    console.log('✅ Plaid link token created successfully');

    return new Response(JSON.stringify({
      link_token: response.data.link_token,
      expiration: response.data.expiration,
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error: any) {
    console.error('❌ Plaid link token creation failed:', error);
    
    return new Response(JSON.stringify({
      error: 'Failed to create Plaid link token',
      details: error.message,
      code: error.code || 'PLAID_LINK_TOKEN_ERROR'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
