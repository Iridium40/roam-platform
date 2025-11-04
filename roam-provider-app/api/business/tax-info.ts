import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  if (req.method === 'GET') {
    try {
      const businessId = (req.query.business_id || req.query.businessId) as string | string[] | undefined;
      const resolvedBusinessId = Array.isArray(businessId) ? businessId[0] : businessId;
      if (!resolvedBusinessId) {
        return res.status(400).json({ error: 'business_id parameter is required' });
      }

      const { data, error } = await supabase
        .from('business_stripe_tax_info')
        .select('*')
        .eq('business_id', resolvedBusinessId)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        return res.status(500).json({ error: 'Failed to fetch tax info', details: (error as any).message });
      }

      return res.status(200).json({ business_id: resolvedBusinessId, tax_info: data || null });
    } catch (err) {
      console.error('Tax info GET error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      console.log('=== TAX INFO PUT REQUEST ===');
      console.log('Request body:', JSON.stringify(req.body, null, 2));
      
      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const { 
        business_id,
        business_entity_type,
        legal_business_name,
        tax_id,
        tax_id_type,
        tax_address_line1,
        tax_address_line2,
        tax_city,
        tax_state,
        tax_postal_code,
        tax_country,
        tax_contact_name,
        tax_contact_email,
        tax_contact_phone
      } = body || {};

      console.log('Extracted fields:', {
        business_id,
        business_entity_type,
        legal_business_name,
        tax_contact_name,
        tax_contact_email,
        tax_id: tax_id ? '***' : undefined,
        tax_id_type
      });

      if (!business_id) {
        console.error('Missing business_id');
        return res.status(400).json({ error: 'business_id is required' });
      }

      // Set contact name and email (email is provided from form, name defaults to business name)
      let contactName = tax_contact_name;
      let contactEmail = tax_contact_email;

      // If contact name not provided, use legal business name
      if (!contactName && legal_business_name) {
        contactName = legal_business_name;
      }

      // If still no contact name or email, try to get from business profile
      if (!contactName || !contactEmail) {
        try {
          const { data: businessProfile, error: businessError } = await supabase
            .from('business_profiles')
            .select('business_name, contact_email')
            .eq('id', business_id)
            .single();

          if (businessError && businessError.code !== 'PGRST116') {
            console.error('Error fetching business profile:', businessError);
            // Continue anyway - we'll try provider fallback
          }

          if (businessProfile) {
            if (!contactName) {
              contactName = businessProfile.business_name || 'Business Owner';
            }
            if (!contactEmail) {
              // Try to get from provider if business contact_email is empty
              if (!businessProfile.contact_email) {
                try {
                  const { data: ownerProvider, error: providerError } = await supabase
                    .from('providers')
                    .select('email, first_name, last_name')
                    .eq('business_id', business_id)
                    .eq('provider_role', 'owner')
                    .single();
                  
                  if (providerError && providerError.code !== 'PGRST116') {
                    console.error('Error fetching owner provider:', providerError);
                  }
                  
                  if (ownerProvider?.email) {
                    contactEmail = ownerProvider.email;
                  } else if (ownerProvider?.first_name && ownerProvider?.last_name && !contactName) {
                    contactName = `${ownerProvider.first_name} ${ownerProvider.last_name}`;
                  }
                } catch (providerErr) {
                  console.error('Exception fetching provider:', providerErr);
                }
              } else {
                contactEmail = businessProfile.contact_email;
              }
            }
          }
        } catch (err) {
          console.error('Exception fetching business profile:', err);
          // Continue - we'll validate email at the end
        }
      }

      // Validate required fields
      if (!contactEmail) {
        console.error('No contact email found:', { business_id, providedEmail: tax_contact_email });
        return res.status(400).json({ 
          error: 'Contact email is required. Please provide a business contact email.' 
        });
      }

      if (!contactName) {
        console.error('No contact name found:', { business_id, providedName: tax_contact_name, businessName: legal_business_name });
        return res.status(400).json({ 
          error: 'Contact name is required. Please provide a legal business name.' 
        });
      }

      // Convert tax_id_type to uppercase to match schema constraint ('EIN' or 'SSN')
      const taxIdTypeUpper = tax_id_type?.toUpperCase() === 'EIN' ? 'EIN' : 
                              tax_id_type?.toUpperCase() === 'SSN' ? 'SSN' : 
                              'EIN'; // Default to EIN

      // Ensure business_entity_type matches schema enum values exactly
      const businessEntityType = ['sole_proprietorship', 'partnership', 'llc', 'corporation', 'non_profit']
        .includes(business_entity_type) ? business_entity_type : 'llc';

      const updatePayload: any = {
        business_id,
        business_entity_type: businessEntityType,
        legal_business_name: legal_business_name || null,
        tax_id: tax_id || null,
        tax_id_type: taxIdTypeUpper,
        tax_address_line1: tax_address_line1 || null,
        tax_address_line2: tax_address_line2 || null,
        tax_city: tax_city || null,
        tax_state: tax_state || null,
        tax_postal_code: tax_postal_code || null,
        tax_country: tax_country || 'US',
        tax_contact_name: contactName || 'Business Owner',
        tax_contact_email: contactEmail,
        tax_contact_phone: tax_contact_phone || null,
        updated_at: new Date().toISOString(),
      };

      console.log('About to upsert with payload (sanitized):', {
        ...updatePayload,
        tax_id: updatePayload.tax_id ? '***' : null
      });

      const { data, error } = await supabase
        .from('business_stripe_tax_info')
        .upsert(updatePayload, { onConflict: 'business_id' })
        .select('*')
        .single();
      
      console.log('Upsert result:', { success: !error, hasData: !!data });

      if (error) {
        console.error('Tax info upsert error:', error);
        console.error('Update payload:', updatePayload);
        return res.status(500).json({ 
          error: 'Failed to save tax info', 
          details: (error as any).message,
          code: (error as any).code
        });
      }

      return res.status(200).json({ message: 'Saved', tax_info: data });
    } catch (err) {
      console.error('Tax info PUT error:', err);
      console.error('Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      return res.status(500).json({ 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
