import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/business-eligible-services
 * 
 * Fetches services that a business is eligible to offer based on their
 * approved service categories and subcategories.
 * 
 * PERMISSIONS:
 * - owner: Can view eligible services for their business
 * - dispatcher: Can view eligible services for their business  
 * - provider: Can view eligible services for their business
 * 
 * Authorization Flow:
 * 1. Platform admins approve businesses for specific service categories
 *    (stored in business_service_categories table)
 * 2. Platform admins approve businesses for specific service subcategories
 *    (stored in business_service_subcategories table)
 * 3. This endpoint returns only services from approved subcategories
 *    whose parent category is also approved
 * 
 * Query params:
 * - business_id: UUID of the business
 * 
 * Returns:
 * - business_id: UUID
 * - service_count: Number of eligible services
 * - eligible_services: Array of services with configuration status
 * - approved_categories_count: Number of approved categories
 * - approved_subcategories_count: Number of approved subcategories
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

    console.log('Authorization successful - Role:', providerData.provider_role);

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
        service_count: 0,
        eligible_services: [],
        message: 'No approved service categories or subcategories. Contact platform administration for service approval.'
      });
    }

    // Step 4: Fetch eligible services based on approved subcategories
    // Filter out any null or invalid UUIDs from validSubcategoryIds
    const cleanSubcategoryIds = validSubcategoryIds.filter(id => {
      // Check if it's a valid UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return id && typeof id === 'string' && uuidRegex.test(id);
    });

    if (cleanSubcategoryIds.length === 0) {
      return res.status(200).json({
        business_id,
        service_count: 0,
        eligible_services: [],
        message: 'No valid approved subcategories found'
      });
    }

    const { data: eligibleServices, error: servicesError } = await supabase
      .from('services')
      .select(`
        id, 
        name, 
        description, 
        min_price, 
        duration_minutes, 
        image_url,
        subcategory_id,
        service_subcategories (
          id,
          service_subcategory_type,
          category_id,
          service_categories (
            id,
            service_category_type
          )
        )
      `)
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

    // Step 5: Get currently configured business services
    const { data: businessServices, error: businessServicesError } = await supabase
      .from('business_services')
      .select('service_id, business_price, is_active')
      .eq('business_id', business_id);

    if (businessServicesError) {
      console.error('Error fetching business services:', businessServicesError);
      // Continue without business services data (won't show is_configured status)
    }

    // Step 6: Process and enrich services with configuration status
    const configuredIds = new Set((businessServices || []).map((bs: any) => bs.service_id));
    const businessServicesMap = new Map((businessServices || []).map((bs: any) => [bs.service_id, bs]));

    const processedServices = (eligibleServices || []).map((service: any) => {
      const subcategoryName = service.service_subcategories?.service_subcategory_type || 'Unknown';
      const categoryName = service.service_subcategories?.service_categories?.service_category_type || 'Unknown';
      
      return {
        id: service.id,
        name: service.name,
        description: service.description,
        min_price: service.min_price,
        duration_minutes: service.duration_minutes,
        image_url: service.image_url,
        subcategory_id: service.subcategory_id,
        subcategory_name: subcategoryName,
        category_name: categoryName,
        is_configured: configuredIds.has(service.id),
        business_price: businessServicesMap.get(service.id)?.business_price,
        business_is_active: businessServicesMap.get(service.id)?.is_active
      };
    });

    return res.status(200).json({
      business_id,
      service_count: processedServices.length,
      eligible_services: processedServices,
      approved_categories_count: approvedCategoryIds.size,
      approved_subcategories_count: validSubcategoryIds.length
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
