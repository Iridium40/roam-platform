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

    const { business_id, user_id } = req.query;
    if (!business_id) {
      return res.status(400).json({ error: 'business_id parameter is required' });
    }

    // Use service role key for all database operations (bypasses RLS)
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Optional: Verify user has permission to access this business if user_id provided
    if (user_id) {
      const { data: providerData, error: providerError } = await supabase
        .from('providers')
        .select('id, user_id, business_id, provider_role')
        .eq('user_id', user_id)
        .eq('business_id', business_id)
        .eq('is_active', true)
        .maybeSingle();

      if (providerError || !providerData) {
        console.error('Provider lookup failed:', providerError);
        return res.status(403).json({ 
          error: 'Access denied',
          message: 'Provider profile not found or you do not have access to this business'
        });
      }
      console.log('Authorization successful - Role:', providerData.provider_role);
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

    // Step 4: Get all services that belong to approved subcategories
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

    // Get all services for the approved subcategories
    const { data: eligibleServices, error: servicesError } = await supabase
      .from('services')
      .select('id')
      .in('subcategory_id', cleanSubcategoryIds)
      .eq('is_active', true);

    if (servicesError) {
      console.error('Error fetching eligible services:', servicesError);
      return res.status(500).json({ 
        error: 'Failed to fetch eligible services',
        details: servicesError.message,
        hint: servicesError.hint,
        code: servicesError.code
      });
    }

    if (!eligibleServices || eligibleServices.length === 0) {
      return res.status(200).json({
        business_id,
        addon_count: 0,
        eligible_addons: [],
        message: 'No services found for approved subcategories'
      });
    }

    const serviceIds = eligibleServices.map(s => s.id);

    // Step 5: Get addon eligibility for these services
    const { data: addonEligibility, error: eligibilityError } = await supabase
      .from('service_addon_eligibility')
      .select(`
        addon_id,
        service_id,
        is_recommended,
        service_addons (
          id,
          name,
          description,
          image_url,
          is_active
        ),
        services (
          id,
          subcategory_id,
          service_subcategories (
            id,
            service_subcategory_type,
            category_id
          )
        )
      `)
      .in('service_id', serviceIds);

    if (eligibilityError) {
      console.error('Error fetching addon eligibility:', eligibilityError);
      return res.status(500).json({ 
        error: 'Failed to fetch addon eligibility',
        details: eligibilityError.message,
        hint: eligibilityError.hint,
        code: eligibilityError.code
      });
    }

    // Extract unique addons from eligibility data
    const addonMap = new Map();
    (addonEligibility || []).forEach((eligibility: any) => {
      if (eligibility.service_addons && eligibility.service_addons.is_active) {
        const addonId = eligibility.addon_id;
        if (!addonMap.has(addonId)) {
          addonMap.set(addonId, {
            ...eligibility.service_addons,
            subcategory_id: eligibility.services?.subcategory_id || null,
            service_subcategories: eligibility.services?.service_subcategories || null,
          });
        }
      }
    });

    const eligibleAddons = Array.from(addonMap.values());

    // Step 5: Get currently configured business addons
    const { data: businessAddons, error: businessAddonsError } = await supabase
      .from('business_addons')
      .select('addon_id, custom_price, is_available')
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
      const businessAddon = businessAddonsMap.get(addon.id);
      return {
        id: addon.id,
        name: addon.name,
        description: addon.description,
        image_url: addon.image_url || null,
        is_active: addon.is_active,
        subcategory_id: addon.subcategory_id || null,
        subcategory_name: subcategoryName,
        is_configured: configuredIds.has(addon.id),
        custom_price: businessAddon?.custom_price ?? null,
        is_available: businessAddon?.is_available ?? null
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
