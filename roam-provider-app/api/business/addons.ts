import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * /api/business/addons
 * 
 * Manages business addons - add-on services that complement main services
 * 
 * Methods:
 * - GET: Fetch business addons with addon details
 * - PUT: Update existing business addon (custom_price, is_available)
 */

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');

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

    // GET: Fetch business addons
    if (req.method === 'GET') {
      const { business_id } = req.query;
      
      if (!business_id) {
        return res.status(400).json({ error: 'business_id parameter is required' });
      }

      const { data: businessAddons, error } = await supabase
        .from('business_addons')
        .select(`
          id,
          business_id,
          addon_id,
          custom_price,
          is_available,
          created_at,
          addons (
            id,
            name,
            description,
            base_price,
            duration_minutes,
            image_url
          )
        `)
        .eq('business_id', business_id);

      if (error) {
        console.error('Error fetching business addons:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch business addons',
          details: error.message 
        });
      }

      return res.status(200).json({
        business_id,
        addons: businessAddons || []
      });
    }

    // PUT: Update or create business addon (upsert)
    if (req.method === 'PUT') {
      const { business_id, addon_id, custom_price, is_available } = req.body;

      if (!business_id || !addon_id) {
        return res.status(400).json({ 
          error: 'business_id and addon_id are required' 
        });
      }

      // Build upsert payload
      const upsertData: any = {
        business_id,
        addon_id,
      };
      if (custom_price !== undefined) upsertData.custom_price = custom_price;
      if (is_available !== undefined) upsertData.is_available = is_available;

      // Upsert: insert if not exists, update if exists
      // Uses the unique constraint on (business_id, addon_id)
      const { data: upserted, error: upsertError } = await supabase
        .from('business_addons')
        .upsert(upsertData, {
          onConflict: 'business_id,addon_id',
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (upsertError) {
        console.error('Error upserting business addon:', upsertError);
        return res.status(500).json({ 
          error: 'Failed to save business addon',
          details: upsertError.message 
        });
      }

      return res.status(200).json({
        success: true,
        addon: upserted
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error: any) {
    console.error('Business addons API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

