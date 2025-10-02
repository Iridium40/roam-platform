import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { business_id } = req.query;
    if (!business_id) {
      return res.status(400).json({ error: 'business_id parameter is required' });
    }

    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id, business_service_subcategories!inner(subcategory_id)')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    const subcategoryIds = business.business_service_subcategories?.map((bs: any) => bs.subcategory_id) || [];

    if (subcategoryIds.length === 0) {
      return res.status(200).json({
        business_id,
        service_count: 0,
        eligible_services: []
      });
    }

    const { data: eligibleServices } = await supabase
      .from('services')
      .select('id, name, description, min_price, duration_minutes, image_url')
      .in('subcategory_id', subcategoryIds)
      .eq('is_active', true);

    const { data: businessServices } = await supabase
      .from('business_services')
      .select('service_id, business_price, is_active')
      .eq('business_id', business_id);

    const configuredIds = new Set((businessServices || []).map((bs: any) => bs.service_id));
    const businessServicesMap = new Map((businessServices || []).map((bs: any) => [bs.service_id, bs]));

    const processedServices = (eligibleServices || []).map((service: any) => ({
      ...service,
      is_configured: configuredIds.has(service.id),
      business_price: businessServicesMap.get(service.id)?.business_price,
      business_is_active: businessServicesMap.get(service.id)?.is_active
    }));

    return res.status(200).json({
      business_id,
      service_count: processedServices.length,
      eligible_services: processedServices
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
