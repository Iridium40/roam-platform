import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { serviceId, businessId, promotionId } = req.query;

    if (!serviceId) {
      return res.status(400).json({ error: 'serviceId is required' });
    }

    // Fetch service details
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('*')
      .eq('id', serviceId)
      .single();

    if (serviceError) {
      console.error('Error fetching service:', serviceError);
      return res.status(404).json({ error: 'Service not found' });
    }

    const response: any = { service };

    // Fetch business if businessId provided
    if (businessId) {
      const { data: business, error: businessError } = await supabase
        .from('business_profiles')
        .select('id, business_name, business_description, image_url, logo_url, business_type')
        .eq('id', businessId)
        .single();

      if (!businessError && business) {
        response.business = business;
      }
    }

    // Fetch promotion if promotionId provided
    if (promotionId) {
      const { data: promotion, error: promotionError } = await supabase
        .from('promotions')
        .select('*')
        .eq('id', promotionId)
        .single();

      if (!promotionError && promotion) {
        response.promotion = promotion;
      }
    }

    // Fetch platform fee configuration
    const { data: feeConfig } = await supabase
      .from('system_config')
      .select('config_value')
      .eq('config_key', 'platform_fee_percentage')
      .maybeSingle();

    response.platformFeePercentage = parseFloat(feeConfig?.config_value || '0') || 0;

    return res.status(200).json(response);

  } catch (error: any) {
    console.error('Error in get-service handler:', error);
    return res.status(500).json({
      error: 'Failed to fetch service details',
      details: error.message
    });
  }
}
