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
    const urlMatch = req.url.match(/\/api\/onboarding\/business-profile\/([a-f0-9-]{36}|[^/?]+)/);
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
      // Handle test business IDs
      if (businessId.startsWith('test-') && businessId !== '12345678-1234-1234-1234-123456789abc') {
        return res.status(200).json({
          businessName: 'Test Business',
          detailedDescription: 'This is a test business for onboarding.',
          websiteUrl: 'https://testbusiness.com',
          socialMediaLinks: {},
          logoUrl: undefined,
          coverImageUrl: undefined,
          businessCategoryRefined: undefined
        });
      }

      // Get business profile
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
      // Handle test business IDs
      if (businessId.startsWith('test-') && businessId !== '12345678-1234-1234-1234-123456789abc') {
        return res.status(200).json({
          success: true,
          message: 'Test business profile updated successfully',
          testMode: true
        });
      }

      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const {
        businessName,
        detailedDescription,
        websiteUrl,
        socialMediaLinks,
        logoUrl,
        coverImageUrl,
        coverImagePosition
      } = body;

      // Check if business exists
      const { data: existingBusiness, error: fetchError } = await supabase
        .from('business_profiles')
        .select('id, business_name')
        .eq('id', businessId)
        .single();

      if (fetchError || !existingBusiness) {
        console.error('Error fetching existing business:', fetchError);
        return res.status(404).json({ error: 'Business profile not found' });
      }

      // Build update object with only defined values
      const updateData: Record<string, any> = {};
      if (businessName !== undefined && businessName !== null && businessName !== '') {
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

      const { error: updateError } = await supabase
        .from('business_profiles')
        .update(updateData)
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

