import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }
    
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    if (req.method === 'GET') {
      const { business_id, page = '1', limit = '25', status } = req.query;
      if (!business_id) {
        return res.status(400).json({ error: 'business_id parameter is required' });
      }

      const pageNum = Math.max(parseInt(page as string, 10), 1);
      const limitNum = Math.min(Math.max(parseInt(limit as string, 10), 1), 100);
      let query = supabase
        .from('business_services')
        .select('id, business_id, service_id, business_price, is_active, delivery_type, created_at', { count: 'exact' })
        .eq('business_id', business_id);

      if (status === 'active') query = query.eq('is_active', true);
      if (status === 'inactive') query = query.eq('is_active', false);

      const from = (pageNum - 1) * limitNum;
      const { data: bsRows, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, from + limitNum - 1);

      if (error) {
        return res.status(500).json({ error: 'Failed to fetch services', details: error.message });
      }

      const serviceIds = Array.from(new Set((bsRows || []).map((r: any) => r.service_id)));
      let serviceMap: Record<string, any> = {};
      
      if (serviceIds.length > 0) {
        const { data: services } = await supabase
          .from('services')
          .select('id, name, description, min_price, duration_minutes, image_url')
          .in('id', serviceIds);
        serviceMap = Object.fromEntries((services || []).map((s: any) => [s.id, s]));
      }

      const services = (bsRows || []).map((row: any) => ({
        ...row,
        services: serviceMap[row.service_id] || null
      }));

      const { count: activeCount } = await supabase
        .from('business_services')
        .select('id', { count: 'exact', head: true })
        .eq('business_id', business_id)
        .eq('is_active', true);

      return res.status(200).json({
        business_id,
        services,
        stats: {
          total_services: count || 0,
          active_services: activeCount || 0,
          total_revenue: 0,
          avg_price: services.length > 0 ? 
            services.reduce((sum: number, s: any) => sum + (parseFloat(s.business_price) || 0), 0) / services.length : 0
        },
        pagination: { page: pageNum, limit: limitNum, total: count || 0 }
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
