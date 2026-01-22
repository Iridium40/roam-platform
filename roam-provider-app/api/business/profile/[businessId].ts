import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Standard CORS headers for all API responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).end();
  }

  if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' });
  }

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  // Extract businessId - try multiple methods
  let businessId: string | undefined;
  
  // Method 1: Direct from req.query (standard Vercel file-based routing)
  if (req.query.businessId && typeof req.query.businessId === 'string') {
    businessId = req.query.businessId;
  }
  
  // Method 2: Extract from URL path if not found
  if (!businessId && req.url) {
    const urlMatch = req.url.match(/\/api\/business\/profile\/([a-f0-9-]{36}|[^/?]+)/);
    if (urlMatch && urlMatch[1]) {
      businessId = urlMatch[1];
    }
  }
  
  // Method 3: Check all query keys for UUID-like values
  if (!businessId) {
    for (const [key, value] of Object.entries(req.query)) {
      const strValue = Array.isArray(value) ? value[0] : String(value);
      if (strValue && /^[a-f0-9-]{36}$/i.test(strValue)) {
        businessId = strValue;
        break;
      }
    }
  }

  if (!businessId || typeof businessId !== 'string') {
    console.error('✗ Failed to extract businessId');
    return res.status(400).json({ 
      error: 'businessId param required',
      debug: {
        url: req.url,
        query: req.query,
        extracted: businessId
      }
    });
  }

  const supabase = createClient(
    process.env.VITE_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  if (req.method === 'GET') {
    try {
      if (businessId.startsWith('test-') && businessId !== '12345678-1234-1234-1234-123456789abc') {
        return res.status(200).json({
          businessName: 'Test Business',
            detailedDescription: 'This is a test business for image upload testing.',
            websiteUrl: 'https://testbusiness.com',
            socialMediaLinks: {},
            logoUrl: undefined,
            coverImageUrl: undefined,
            businessCategoryRefined: undefined
        });
      }

      if (process.env.NODE_ENV === 'development') {
        return res.status(200).json({
          businessName: 'Test Business',
          detailedDescription: 'This is a test business for Stripe Connect testing.',
          websiteUrl: 'https://testbusiness.com',
          socialMediaLinks: {},
          logoUrl: undefined,
          coverImageUrl: undefined,
          businessCategoryRefined: undefined,
          email: 'test@example.com',
          business_type: 'llc',
          verification_status: 'approved',
          identity_verified: true,
          bank_connected: true
        });
      }

      const { data: business, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error || !business) {
        console.error('Error fetching business profile:', error);
        return res.status(404).json({ error: 'Business profile not found' });
      }

      return res.status(200).json({
        businessName: business.business_name,
        detailedDescription: business.business_description || '',
        websiteUrl: business.website_url || '',
        socialMediaLinks: business.social_media || {},
        logoUrl: business.logo_url,
        coverImageUrl: business.cover_image_url,
        coverImagePosition: business.cover_image_position,
        businessCategoryRefined: business.business_category_refined
      });
    } catch (error) {
      console.error('Error in business profile GET:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const {
        businessName,
        detailedDescription,
        websiteUrl,
        socialMediaLinks,
        logoUrl,
        coverImageUrl,
        coverImagePosition,
        contact_email
      } = body;

      // Validate required fields (businessName is only required if provided and not empty)
      // Allow undefined/null/empty string - we'll only update if a value is provided
      if (businessName !== undefined && businessName !== null && businessName !== '' && (typeof businessName !== 'string' || !businessName.trim())) {
        return res.status(400).json({ error: 'businessName must be a non-empty string' });
      }

      if (businessId.startsWith('test-') && businessId !== '12345678-1234-1234-1234-123456789abc') {
        return res.status(200).json({
          success: true,
          message: 'Test business profile saved successfully',
          testMode: true
        });
      }

      const { data: existingBusiness, error: fetchError } = await supabase
        .from('business_profiles')
        .select('id, business_name')
        .eq('id', businessId)
        .single();

      if (fetchError || !existingBusiness) {
        console.error('Error fetching existing business:', fetchError);
        return res.status(404).json({ error: 'Business profile not found' });
      }

      // If businessName is provided but empty, and it doesn't exist in DB, that's an error
      // But if businessName is empty/undefined and it exists in DB, that's fine - we're just updating other fields
      if (businessName !== undefined && businessName !== null && businessName !== '') {
        if (typeof businessName !== 'string' || !businessName.trim()) {
          return res.status(400).json({ error: 'businessName must be a non-empty string' });
        }
      } else if (!existingBusiness.business_name) {
        // Business name is required if it doesn't exist in the database
        return res.status(400).json({ error: 'businessName is required' });
      }

      // Prepare update data, only including defined values
      // Explicitly exclude admin-managed fields like verification_status
      const allowedFields = ['business_name', 'business_description', 'website_url', 'social_media', 'logo_url', 'cover_image_url', 'contact_email'];
      const updateData: Record<string, any> = {};

      if (businessName !== undefined && businessName !== null && businessName !== '' && typeof businessName === 'string') {
        updateData.business_name = businessName.trim();
      }
      if (detailedDescription !== undefined) {
        updateData.business_description = detailedDescription || null;
      }
      if (websiteUrl !== undefined) {
        updateData.website_url = websiteUrl?.trim() || null;
      }
      if (socialMediaLinks !== undefined) {
        updateData.social_media = socialMediaLinks || {};
      }
      if (logoUrl !== undefined) {
        updateData.logo_url = logoUrl || null;
      }
      if (coverImageUrl !== undefined) {
        updateData.cover_image_url = coverImageUrl || null;
      }
      if (coverImagePosition !== undefined) {
        const pos = Number(coverImagePosition);
        if (Number.isFinite(pos)) {
          updateData.cover_image_position = Math.max(0, Math.min(100, pos));
        }
      }
      if (contact_email !== undefined) {
        updateData.contact_email = contact_email || null;
      }

      // Filter out any admin-managed fields that shouldn't be updated by provider app
      const filteredUpdateData: Record<string, any> = {};
      for (const key of Object.keys(updateData)) {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key];
        }
      }

      const { error: updateError } = await supabase
        .from('business_profiles')
        .update(filteredUpdateData)
        .eq('id', businessId);

      if (updateError) {
        console.error('Error updating business profile:', updateError);
        return res.status(500).json({ error: 'Failed to update business profile' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error in business profile PUT:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
