import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Check environment variables first
    const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing environment variables:', {
        supabaseUrl: !!supabaseUrl,
        serviceRoleKey: !!supabaseKey,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes('SUPABASE'))
      });
      return res.status(500).json({ 
        error: 'Server configuration error',
        details: 'Missing required Supabase environment variables'
      });
    }

    // Create Supabase client directly
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (req.method) {
      case 'GET':
        // Fetch businesses with basic data first, then add joins if this works
        const { data: businesses, error: fetchError } = await supabase
          .from('business_profiles')
          .select(`
            id,
            business_name,
            contact_email,
            phone,
            verification_status,
            stripe_account_id,
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

      case 'PUT':
        // Update a business profile
        const {
          id,
          business_name,
          contact_email,
          phone,
          verification_status,
          verification_notes,
          is_active,
          is_featured,
          business_type,
        } = req.body;

        if (!id) {
          return res.status(400).json({ error: 'Business ID is required' });
        }

        // Build the update object with only provided fields
        const updateData: Record<string, any> = {};
        if (business_name !== undefined) updateData.business_name = business_name;
        if (contact_email !== undefined) updateData.contact_email = contact_email;
        if (phone !== undefined) updateData.phone = phone;
        if (verification_status !== undefined) updateData.verification_status = verification_status;
        if (verification_notes !== undefined) updateData.verification_notes = verification_notes;
        if (is_active !== undefined) updateData.is_active = is_active;
        if (is_featured !== undefined) updateData.is_featured = is_featured;
        if (business_type !== undefined) updateData.business_type = business_type;

        // Add approval tracking if status changes to approved
        if (verification_status === 'approved') {
          updateData.approved_at = new Date().toISOString();
        }

        const { data: updatedBusiness, error: updateError } = await supabase
          .from('business_profiles')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating business:', updateError);
          return res.status(500).json({ 
            error: updateError.message,
            details: updateError.details || 'Failed to update business'
          });
        }

        return res.status(200).json({ data: updatedBusiness });

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in businesses API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}