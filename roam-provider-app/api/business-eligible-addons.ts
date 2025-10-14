import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/business-eligible-addons
 *
 * Fetches add-ons that a business is eligible to offer based on their
 * approved service categories and subcategories.
 *
 * Query params:
 * - business_id: UUID of the business
 *
 * Returns:
 * - business_id: UUID
 * - addon_count: Number of eligible add-ons
 * - eligible_addons: Array of add-ons with configuration status
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { business_id } = req.query;
    if (!business_id) {
      return res.status(400).json({ error: 'business_id parameter is required' });
    }

    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please sign in to access this resource'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user and get their provider role
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        message: 'Please sign in again'
      });
    }

    // Get provider record to check role and business association
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('id, user_id, business_id, provider_role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (providerError || !providerData) {
      console.error('Provider lookup failed:', providerError);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Provider profile not found or inactive'
      });
    }

    // Verify user has permission to access this business
    if (providerData.business_id !== business_id) {
      console.error('Business ID mismatch - Access denied');
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this business'
      });
    }

    // Step 1: Verify business exists
    const { data: business, error: businessError } = await supabase
      .from('business_profiles')
      .select('id')
      .eq('id', business_id)
      .single();

    if (businessError || !business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Step 2: Get approved subcategories for this business
    const { data: approvedSubcategories, error: subcategoriesError } = await supabase
      .from('business_service_subcategories')
      .select('subcategory_id, category_id')
      .eq('business_id', business_id)
      .eq('is_active', true);

    if (subcategoriesError) {
      console.error('Error fetching approved subcategories:', subcategoriesError);
      return res.status(500).json({ error: 'Failed to fetch approved subcategories' });
    }

    // Step 3: Get approved categories for this business (for validation)
    const { data: approvedCategories, error: categoriesError } = await supabase
      .from('business_service_categories')
      .select('category_id')
      .eq('business_id', business_id)
      .eq('is_active', true);

    if (categoriesError) {
      console.error('Error fetching approved categories:', categoriesError);
      return res.status(500).json({ error: 'Failed to fetch approved categories' });
    }

    // Create sets for efficient lookup
    const approvedCategoryIds = new Set(
      (approvedCategories || []).map((ac: any) => ac.category_id)
    );
    
    // Only include subcategories whose parent category is also approved
    const validSubcategoryIds = (approvedSubcategories || [])
      .filter((sub: any) => approvedCategoryIds.has(sub.category_id))
      .map((sub: any) => sub.subcategory_id);

    if (validSubcategoryIds.length === 0) {
      return res.status(200).json({
        business_id,
        addon_count: 0,
        eligible_addons: [],
        message: 'No approved service categories or subcategories. Contact platform administration for add-on approval.'
      });
    }

    // Step 4: Fetch eligible add-ons based on approved subcategories
    // Filter out any null or invalid UUIDs from validSubcategoryIds
    const cleanSubcategoryIds = validSubcategoryIds.filter(id => {
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return id && typeof id === 'string' && uuidRegex.test(id);
    });

    if (cleanSubcategoryIds.length === 0) {
      return res.status(200).json({
        business_id,
        addon_count: 0,
        eligible_addons: [],
        message: 'No valid approved subcategories found'
      });
    }

    // Query service_addons with eligibility
    const { data: eligibleAddons, error: addonsError } = await supabase
      .from('service_addons')
      .select(`
        id,
        name,
        description,
        price,
        is_active,
        subcategory_id,
        service_subcategories (
          id,
          service_subcategory_type,
          category_id
        )
      `)
      .in('subcategory_id', cleanSubcategoryIds)
      .eq('is_active', true);

    if (addonsError) {
      console.error('Error fetching eligible addons:', addonsError);
      return res.status(500).json({ 
        error: 'Failed to fetch eligible addons',
        details: addonsError.message,
        hint: addonsError.hint,
        code: addonsError.code
      });
    }

    // Step 5: Get currently configured business addons
    const { data: businessAddons, error: businessAddonsError } = await supabase
      .from('business_addons')
      .select('addon_id, business_price, is_active')
      .eq('business_id', business_id);

    if (businessAddonsError) {
      console.error('Error fetching business addons:', businessAddonsError);
      // Continue without business addons data (won't show is_configured status)
    }

    // Step 6: Process and enrich addons with configuration status
    const configuredIds = new Set((businessAddons || []).map((ba: any) => ba.addon_id));
    const businessAddonsMap = new Map((businessAddons || []).map((ba: any) => [ba.addon_id, ba]));

    const processedAddons = (eligibleAddons || []).map((addon: any) => {
      const subcategoryName = addon.service_subcategories?.service_subcategory_type || 'Unknown';
      return {
        id: addon.id,
        name: addon.name,
        description: addon.description,
        price: addon.price,
        is_active: addon.is_active,
        subcategory_id: addon.subcategory_id,
        subcategory_name: subcategoryName,
        is_configured: configuredIds.has(addon.id),
        business_price: businessAddonsMap.get(addon.id)?.business_price,
        business_is_active: businessAddonsMap.get(addon.id)?.is_active
      };
    });

    return res.status(200).json({
      business_id,
      addon_count: processedAddons.length,
      eligible_addons: processedAddons
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
