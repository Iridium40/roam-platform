import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../server/lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    switch (req.method) {
      case 'GET':
        // Fetch businesses with their service categories and subcategories
        const { data: businesses, error: fetchError } = await supabase
          .from('business_profiles')
          .select(`
            id,
            business_name,
            contact_email,
            phone,
            verification_status,
            stripe_connect_account_id,
            is_active,
            created_at,
            image_url,
            website_url,
            logo_url,
            cover_image_url,
            business_hours,
            social_media,
            verification_notes,
            business_type,
            service_categories,
            service_subcategories,
            setup_completed,
            setup_step,
            is_featured,
            identity_verified,
            identity_verified_at,
            bank_connected,
            bank_connected_at,
            application_submitted_at,
            approved_at,
            approved_by,
            approval_notes,
            business_description,
            business_service_categories (
              id,
              business_id,
              category_id,
              is_active,
              created_at,
              updated_at,
              service_categories (
                id,
                description,
                service_category_type
              )
            ),
            business_service_subcategories (
              id,
              business_id,
              category_id,
              subcategory_id,
              is_active,
              created_at,
              updated_at,
              service_categories (
                id,
                description,
                service_category_type
              ),
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

        // Transform the data to match the expected format
        const transformedBusinesses = businesses?.map((business: any) => {
          // Handle service categories - prefer database array over joined data
          const serviceCategories = business.service_categories || 
            business.business_service_categories?.map((cat: any) => cat.service_categories?.service_category_type).filter(Boolean) || 
            [];
          
          // Handle service subcategories - prefer database array over joined data  
          const serviceSubcategories = business.service_subcategories ||
            business.business_service_subcategories?.map((subcat: any) => subcat.service_subcategories?.service_subcategory_type).filter(Boolean) || 
            [];

          return {
            ...business,
            service_categories: serviceCategories,
            service_subcategories: serviceSubcategories,
            // Ensure numeric fields are properly typed
            setup_step: business.setup_step ? Number(business.setup_step) : null,
            // Ensure boolean fields have defaults
            setup_completed: business.setup_completed ?? null,
            is_featured: business.is_featured ?? false,
            identity_verified: business.identity_verified ?? false,
            bank_connected: business.bank_connected ?? false,
            is_active: business.is_active ?? true
          };
        }) || [];

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