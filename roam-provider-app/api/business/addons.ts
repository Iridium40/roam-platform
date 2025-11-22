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

    // PUT: Update business addon
    if (req.method === 'PUT') {
      const { business_id, addon_id, custom_price, is_available } = req.body;

      if (!business_id || !addon_id) {
        return res.status(400).json({ 
          error: 'business_id and addon_id are required' 
        });
      }

      // Validate that this business addon exists
      const { data: existing, error: checkError } = await supabase
        .from('business_addons')
        .select('id')
        .eq('business_id', business_id)
        .eq('addon_id', addon_id)
        .single();

      if (checkError || !existing) {
        return res.status(404).json({ 
          error: 'Business addon not found',
          details: 'This addon is not configured for this business'
        });
      }

      // Build update payload
      const updateData: any = {};
      if (custom_price !== undefined) updateData.custom_price = custom_price;
      if (is_available !== undefined) updateData.is_available = is_available;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ 
          error: 'No update fields provided' 
        });
      }

      // Update the business addon
      const { data: updated, error: updateError } = await supabase
        .from('business_addons')
        .update(updateData)
        .eq('business_id', business_id)
        .eq('addon_id', addon_id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating business addon:', updateError);
        return res.status(500).json({ 
          error: 'Failed to update business addon',
          details: updateError.message 
        });
      }

      return res.status(200).json({
        success: true,
        addon: updated
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

