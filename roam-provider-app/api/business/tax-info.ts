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
      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const { business_id, legal_entity_type, legal_name, tax_id_type, tax_id_full, address, w9_signed } = body || {};
      if (!business_id) {
        return res.status(400).json({ error: 'business_id is required' });
      }

      let tax_id_last4: string | null = null;
      if (typeof tax_id_full === 'string' && tax_id_full.trim().length >= 4) {
        const digits = tax_id_full.replace(/\D/g, '');
        tax_id_last4 = digits.slice(-4) || null;
      }

      const updatePayload: any = {
        business_id,
        legal_entity_type: legal_entity_type || null,
        legal_name: legal_name || null,
        tax_id_type: tax_id_type || null,
        tax_id_last4: tax_id_last4 || null,
        address_line1: address?.line1 || null,
        address_line2: address?.line2 || null,
        city: address?.city || null,
        state: address?.state || null,
        postal_code: address?.postal_code || null,
        country: address?.country || 'US',
        w9_signed: !!w9_signed,
        w9_signed_at: w9_signed ? new Date().toISOString() : null
      };

      const { data, error } = await supabase
        .from('business_stripe_tax_info')
        .upsert(updatePayload, { onConflict: 'business_id' })
        .select('*')
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to save tax info', details: (error as any).message });
      }

      return res.status(200).json({ message: 'Saved', tax_info: data });
    } catch (err) {
      console.error('Tax info PUT error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
