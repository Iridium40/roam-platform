import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Handle GET request first
    if (req.method === 'GET') {
      const { customerId: queryCustomerId } = req.query;

      if (!queryCustomerId) {
        return res.status(400).json({ 
          error: 'Customer ID is required',
          code: 'MISSING_CUSTOMER_ID'
        });
      }

      const { data, error } = await supabase
        .from('customer_favorite_providers')
        .select(`
          id,
          customer_id,
          provider_id,
          created_at,
          providers (
            id,
            user_id,
            first_name,
            last_name,
            business_profiles (
              business_name
            ),
            image_url
          )
        `)
        .eq('customer_id', queryCustomerId as string)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching provider favorites:', error);
        return res.status(500).json({ 
          error: 'Failed to fetch favorites',
          details: error.message,
          code: 'FETCH_ERROR'
        });
      }

      return res.status(200).json({ 
        success: true, 
        data: data || []
      });
    }

    // Handle POST and DELETE requests
    const { customerId, providerId, action } = req.body;

    if (!customerId) {
      return res.status(400).json({ 
        error: 'Customer ID is required',
        code: 'MISSING_CUSTOMER_ID'
      });
    }

    if (req.method === 'POST' && action === 'add') {
      if (!providerId) {
        return res.status(400).json({ 
          error: 'Provider ID is required',
          code: 'MISSING_PROVIDER_ID'
        });
      }

      // Check if favorite already exists
      const { data: existing } = await supabase
        .from('customer_favorite_providers')
        .select('id')
        .eq('customer_id', customerId)
        .eq('provider_id', providerId)
        .single();

      if (existing) {
        return res.status(200).json({ 
          success: true, 
          message: 'Favorite already exists',
          data: existing
        });
      }

      // Insert new favorite
      const { data, error } = await supabase
        .from('customer_favorite_providers')
        .insert({
          customer_id: customerId,
          provider_id: providerId,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding provider favorite:', error);
        return res.status(500).json({ 
          error: 'Failed to add favorite',
          details: error.message,
          code: 'INSERT_ERROR'
        });
      }

      return res.status(200).json({ 
        success: true, 
        data 
      });
    }

    if (req.method === 'DELETE' || (req.method === 'POST' && action === 'remove')) {
      if (!providerId) {
        return res.status(400).json({ 
          error: 'Provider ID is required',
          code: 'MISSING_PROVIDER_ID'
        });
      }

      const { error } = await supabase
        .from('customer_favorite_providers')
        .delete()
        .eq('customer_id', customerId)
        .eq('provider_id', providerId);

      if (error) {
        console.error('Error removing provider favorite:', error);
        return res.status(500).json({ 
          error: 'Failed to remove favorite',
          details: error.message,
          code: 'DELETE_ERROR'
        });
      }

      return res.status(200).json({ 
        success: true,
        message: 'Favorite removed successfully'
      });
    }

    return res.status(405).json({ 
      error: 'Method not allowed',
      code: 'METHOD_NOT_ALLOWED'
    });
  } catch (error: any) {
    console.error('Unexpected error in provider favorites API:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message,
      code: 'INTERNAL_ERROR'
    });
  }
}

