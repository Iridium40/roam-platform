import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export async function handleBusinesses(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        // Fetch businesses with their service categories and subcategories
        const { data: businesses, error: fetchError } = await supabase
          .from('business_profiles')
          .select(`
            *,
            business_service_categories (
              id,
              business_id,
              category_id,
              created_at,
              service_categories (
                id,
                description,
                service_category_type
              )
            ),
            business_service_subcategories (
              id,
              business_id,
              subcategory_id,
              created_at,
              service_subcategories (
                id,
                description,
                service_subcategory_type
              )
            )
          `)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching businesses:', fetchError);
          return res.status(500).json({ error: fetchError.message });
        }

        // Transform the data to match the expected format
        const transformedBusinesses = businesses?.map(business => ({
          ...business,
          service_categories: business.business_service_categories?.map(cat => cat.service_categories?.service_category_type).filter(Boolean) || [],
          service_subcategories: business.business_service_subcategories?.map(subcat => subcat.service_subcategories?.service_subcategory_type).filter(Boolean) || []
        })) || [];

        return res.status(200).json({ data: transformedBusinesses });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in businesses API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}
