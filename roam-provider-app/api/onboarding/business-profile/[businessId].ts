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

  // Dynamic route params are exposed via query on Vercel
  // Try multiple possible keys and handle different formats
  let businessIdRaw = req.query.businessId || req.query.business_id || req.query['[businessId]'];
  
  // If still not found, try extracting from URL path
  if (!businessIdRaw && req.url) {
    const urlMatch = req.url.match(/\/api\/onboarding\/business-profile\/([^/?]+)/);
    if (urlMatch) {
      businessIdRaw = urlMatch[1];
    }
  }
  
  const businessId = Array.isArray(businessIdRaw) ? businessIdRaw[0] : (businessIdRaw as string | undefined);

  Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));

  if (!businessId || typeof businessId !== 'string') {
    console.error('Business ID extraction failed:', {
      query: req.query,
      url: req.url,
      extracted: businessId
    });
    return res.status(400).json({ error: 'businessId param required' });
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
        .from('businesses')
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
        businessCategoryRefined: business.business_category_refined
      });
    } catch (error) {
      console.error('Error in business profile GET:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

