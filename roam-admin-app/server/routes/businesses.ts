import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export async function handleBusinesses(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        // Fetch businesses with explicit column selection to match current schema
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
            business_description
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

        // Transform the data to ensure proper types
        const transformedBusinesses = businesses?.map((business: any) => ({
          ...business,
          // Ensure arrays are properly handled
          service_categories: Array.isArray(business.service_categories) ? business.service_categories : [],
          service_subcategories: Array.isArray(business.service_subcategories) ? business.service_subcategories : [],
          // Ensure numeric fields are properly typed
          setup_step: business.setup_step ? Number(business.setup_step) : null,
          // Ensure boolean fields have defaults
          setup_completed: business.setup_completed ?? null,
          is_featured: business.is_featured ?? false,
          identity_verified: business.identity_verified ?? false,
          bank_connected: business.bank_connected ?? false,
          is_active: business.is_active ?? true
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
