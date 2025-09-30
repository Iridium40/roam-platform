import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testParam = searchParams.get('test');

    const response = {
      status: 'success',
      message: 'Provider App API is working correctly',
      timestamp: new Date().toISOString(),
      test_param: testParam,
      environment_check: {
        supabase_url: process.env.VITE_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
        service_role_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
        stripe_key: process.env.STRIPE_SECRET_KEY ? 'configured' : 'missing',
        plaid_client_id: process.env.PLAID_CLIENT_ID ? 'configured' : 'missing'
      },
      api_endpoints: {
        business_services: '/api/business/services',
        eligible_services: '/api/business-eligible-services',
        staff_invite: '/api/staff/invite',
        upload_documents: '/api/business/upload-documents'
      }
    };

    return NextResponse.json(response, { 
      status: 200, 
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error in diagnostic endpoint:', error);
    return NextResponse.json(
      { 
        status: 'error',
        message: 'API diagnostic failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { 
        status: 500, 
        headers: corsHeaders 
      }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders });
}