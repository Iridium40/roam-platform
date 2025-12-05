import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../server/lib/supabase.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET':
        const { data: locations, error: fetchError } = await supabase
          .from('business_locations')
          .select(`
            id,
            business_id,
            location_name,
            address_line1,
            address_line2,
            city,
            state,
            postal_code,
            country,
            latitude,
            longitude,
            is_active,
            created_at,
            is_primary,
            offers_mobile_services,
            mobile_service_radius
          `)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching business locations:', fetchError);
          console.error('Error details:', {
            message: fetchError.message,
            details: fetchError.details,
            hint: fetchError.hint,
            code: fetchError.code
          });
          return res.status(500).json({ 
            error: fetchError.message,
            details: fetchError.details || 'Check server logs for more information'
          });
        }

        return res.status(200).json({ data: locations || [] });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in business locations API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}