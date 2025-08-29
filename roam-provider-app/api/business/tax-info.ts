import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders });
}

// GET /api/business/tax-info?business_id=...
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');
    if (!businessId) {
      return NextResponse.json({ error: 'business_id parameter is required' }, { status: 400, headers: corsHeaders });
    }

    const { data, error } = await supabaseAdmin
      .from('business_stripe_tax_info')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch tax info', details: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ business_id: businessId, tax_info: data || null }, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}

// PUT /api/business/tax-info
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, legal_entity_type, legal_name, tax_id_type, tax_id_full, address, w9_signed } = body || {};

    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400, headers: corsHeaders });
    }

    // Only persist last4 of provided tax id
    let tax_id_last4: string | null = null;
    if (typeof tax_id_full === 'string' && tax_id_full.trim().length >= 4) {
      const digits = tax_id_full.replace(/\D/g, '');
      tax_id_last4 = digits.slice(-4) || null;
    }

    const updatePayload: any = {
      business_id,
      legal_entity_type: legal_entity_type || null,
      legal_name: legal_name || null,
      tax_id_type: tax_id_type || null,
      tax_id_last4: tax_id_last4 || null,
      address_line1: address?.line1 || null,
      address_line2: address?.line2 || null,
      city: address?.city || null,
      state: address?.state || null,
      postal_code: address?.postal_code || null,
      country: address?.country || 'US',
      w9_signed: !!w9_signed,
      w9_signed_at: w9_signed ? new Date().toISOString() : null,
    };

    // Upsert by business_id
    const { data, error } = await supabaseAdmin
      .from('business_stripe_tax_info')
      .upsert(updatePayload, { onConflict: 'business_id' })
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to save tax info', details: error.message }, { status: 500, headers: corsHeaders });
    }

    return NextResponse.json({ message: 'Saved', tax_info: data }, { headers: corsHeaders });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders });
  }
}
