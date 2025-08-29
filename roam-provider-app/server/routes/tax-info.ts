import { RequestHandler } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export const getBusinessTaxInfo: RequestHandler = async (req, res) => {
  try {
    const businessId = (req.query.business_id as string) || (req.params.businessId as string);
    if (!businessId) return res.status(400).json({ error: 'business_id parameter is required' });

    const { data, error } = await supabaseAdmin
      .from('business_stripe_tax_info')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Tax info fetch error:', error);
      return res.status(500).json({ error: 'Failed to fetch tax info', details: error.message });
    }

    return res.status(200).json({ business_id: businessId, tax_info: data || null });
  } catch (e: any) {
    console.error('getBusinessTaxInfo error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const upsertBusinessTaxInfo: RequestHandler = async (req, res) => {
  try {
    const {
      business_id,
      legal_business_name,
      tax_id,
      tax_id_type,
      tax_address_line1,
      tax_address_line2,
      tax_city,
      tax_state,
      tax_postal_code,
      tax_country,
      business_entity_type,
      tax_contact_name,
      tax_contact_email,
      tax_contact_phone,
      w9_status,
      tax_setup_completed
    } = req.body || {};

    if (!business_id || !legal_business_name || !tax_id || !tax_id_type || !tax_address_line1 || !tax_city || !tax_state || !tax_postal_code || !business_entity_type || !tax_contact_name || !tax_contact_email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const payload: any = {
      business_id,
      legal_business_name,
      tax_id,
      tax_id_type,
      tax_address_line1,
      tax_address_line2: tax_address_line2 || null,
      tax_city,
      tax_state,
      tax_postal_code,
      tax_country: tax_country || 'US',
      business_entity_type,
      tax_contact_name,
      tax_contact_email,
      tax_contact_phone: tax_contact_phone || null,
      w9_status: w9_status || 'not_collected',
      tax_setup_completed: !!tax_setup_completed
    };

    const { data, error } = await supabaseAdmin
      .from('business_stripe_tax_info')
      .upsert(payload, { onConflict: 'business_id' })
      .select('*')
      .single();

    if (error) {
      console.error('Tax info upsert error:', error);
      return res.status(500).json({ error: 'Failed to save tax info', details: error.message });
    }

    return res.status(200).json({ message: 'Saved', tax_info: data });
  } catch (e: any) {
    console.error('upsertBusinessTaxInfo error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
