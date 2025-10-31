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

  // Dynamic route params: Vercel rewrites pass the captured segment as a query param
  // For /api/onboarding/business-profile/(.*) -> [businessId].ts, the segment is in req.query
  let businessId: string | undefined;
  
  // Check all possible query param locations
  const possibleKeys = ['businessId', 'business_id', '[businessId]', ...Object.keys(req.query)];
  
  for (const key of possibleKeys) {
    const value = req.query[key];
    if (value && typeof value === 'string' && value.length > 10) {
      // Skip if it's clearly not a UUID/business ID format
      if (!value.includes('=') && !value.includes('&')) {
        businessId = value;
        break;
      }
    } else if (Array.isArray(value) && value[0] && typeof value[0] === 'string') {
      if (value[0].length > 10) {
        businessId = value[0];
        break;
      }
    }
  }
  
  // Fallback: extract from URL path
  if (!businessId && req.url) {
    const urlMatch = req.url.match(/\/api\/onboarding\/business-profile\/([^/?]+)/);
    if (urlMatch && urlMatch[1] && urlMatch[1].length > 10) {
      businessId = urlMatch[1];
    }
  }

  if (!businessId || typeof businessId !== 'string') {
    console.error('Business ID extraction failed:', {
      query: req.query,
      url: req.url,
      queryKeys: Object.keys(req.query),
      extracted: businessId,
      allQueryValues: Object.values(req.query)
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

