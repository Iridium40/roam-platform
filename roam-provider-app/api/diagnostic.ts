import type { VercelRequest, VercelResponse } from '@vercel/node';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

function applyCors(res: VercelResponse) {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.status(200).send('ok');
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const testParam = typeof req.query.test === 'string' ? req.query.test : undefined;

    const response = {
      status: 'success',
      message: 'Provider App API is working correctly',
      timestamp: new Date().toISOString(),
      test_param: testParam,
      environment_check: {
        supabase_url: process.env.VITE_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
        stripe_key: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
      },
      api_endpoints: {
        business_services: '/api/business/services',
        eligible_services: '/api/business-eligible-services',
        staff_invite: '/api/staff/invite',
        upload_documents: '/api/business/upload-documents',
      },
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    res.status(500).json({
      status: 'error',
      message: 'API diagnostic failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}