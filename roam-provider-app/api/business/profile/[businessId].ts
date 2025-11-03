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

  // Dynamic route params: Vercel passes them via req.query (like provider/profile/[userId].ts)
  const { businessId } = req.query;

  if (typeof businessId !== 'string') {
    return res.status(400).json({ error: 'businessId param required' });
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

  if (req.method === 'PUT') {
    try {
      const body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}');
      const {
        businessName,
        detailedDescription,
        websiteUrl,
        socialMediaLinks,
        logoUrl,
        coverImageUrl
      } = body;

      // Validate required fields
      if (!businessName || typeof businessName !== 'string' || !businessName.trim()) {
        return res.status(400).json({ error: 'businessName is required and must be a non-empty string' });
      }

      if (businessId.startsWith('test-') && businessId !== '12345678-1234-1234-1234-123456789abc') {
        return res.status(200).json({
          success: true,
          message: 'Test business profile saved successfully',
          testMode: true
        });
      }

      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('id', businessId)
        .single();

      if (!existingBusiness) {
        return res.status(404).json({ error: 'Business profile not found' });
      }

      // Prepare update data, only including defined values
      // Explicitly exclude admin-managed fields like verification_status
      const allowedFields = ['business_name', 'business_description', 'website_url', 'social_media', 'logo_url', 'cover_image_url'];
      const updateData: Record<string, any> = {
        business_name: businessName.trim(),
      };

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

      // Filter out any admin-managed fields that shouldn't be updated by provider app
      const filteredUpdateData: Record<string, any> = {};
      for (const key of Object.keys(updateData)) {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key];
        }
      }

      const { error: updateError } = await supabase
        .from('businesses')
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
