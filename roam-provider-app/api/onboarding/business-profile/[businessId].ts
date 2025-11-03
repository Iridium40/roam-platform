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

  // Comprehensive logging to debug businessId extraction
  console.log('=== Onboarding Business Profile Debug ===');
  console.log('req.url:', req.url);
  console.log('req.query:', JSON.stringify(req.query, null, 2));
  console.log('req.method:', req.method);
  
  // Extract businessId - try multiple methods
  let businessId: string | undefined;
  
  // Method 1: Direct from req.query (standard Vercel file-based routing)
  if (req.query.businessId && typeof req.query.businessId === 'string') {
    businessId = req.query.businessId;
    console.log('✓ Found businessId in req.query.businessId:', businessId);
  }
  
  // Method 2: Extract from URL path if not found
  if (!businessId && req.url) {
    const urlMatch = req.url.match(/\/api\/onboarding\/business-profile\/([a-f0-9-]{36}|[^/?]+)/);
    if (urlMatch && urlMatch[1]) {
      businessId = urlMatch[1];
      console.log('✓ Extracted businessId from URL path:', businessId);
    }
  }
  
  // Method 3: Check all query keys for UUID-like values
  if (!businessId) {
    for (const [key, value] of Object.entries(req.query)) {
      const strValue = Array.isArray(value) ? value[0] : String(value);
      if (strValue && /^[a-f0-9-]{36}$/i.test(strValue)) {
        businessId = strValue;
        console.log(`✓ Found businessId in req.query.${key}:`, businessId);
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

