import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/business/service-eligibility
 * 
 * Fetches approved service categories and subcategories for a business
 * 
 * PERMISSIONS:
 * - owner: Can view their business's service eligibility
 * - dispatcher: Can view their business's service eligibility
 * - provider: Can view their business's service eligibility
 * 
 * Query params:
 * - business_id: UUID of the business
 * 
 * Returns:
 * - business_id: UUID
 * - approved_categories: Array of categories with their subcategories
 * - stats: Counts of categories and subcategories
 * - last_updated: Most recent update timestamp
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Initialize Supabase client inside handler
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing environment variables:', {
        hasUrl: !!process.env.VITE_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
      });
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { business_id } = req.query;

    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    // Get authorization token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please sign in to access business settings'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify user and get their provider role
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('🔍 User verification failed:', userError);
      return res.status(401).json({ 
        error: 'Invalid or expired token',
        message: 'Please sign in again'
      });
    }

    console.log('🔍 service-eligibility API - User authenticated:', user.id);

    // Get provider record to check role and business association
    const { data: providerData, error: providerError } = await supabase
      .from('providers')
      .select('id, user_id, business_id, provider_role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (providerError || !providerData) {
      console.error('🔍 Provider lookup failed:', providerError);
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'Provider profile not found or inactive'
      });
    }

    console.log('🔍 Provider role and business:', {
      provider_role: providerData.provider_role,
      provider_business_id: providerData.business_id,
      requested_business_id: business_id
    });

    // Verify user has permission to access this business
    if (providerData.business_id !== business_id) {
      console.error('🔍 Business ID mismatch - Access denied');
      return res.status(403).json({ 
        error: 'Access denied',
        message: 'You do not have permission to access this business',
        debug: {
          your_business_id: providerData.business_id,
          requested_business_id: business_id
        }
      });
    }

    // All roles (owner, dispatcher, provider) can VIEW service eligibility
    // Only owners can MODIFY (handled in other endpoints)
    console.log('🔍 Authorization successful - Role:', providerData.provider_role);

    console.log('🔍 service-eligibility API - Querying business_id:', business_id);

    // Verify business exists
    const { data: businessExists, error: businessCheckError } = await supabase
      .from('business_profiles')
      .select('id, business_name')
      .eq('id', business_id)
      .maybeSingle();

    console.log('🔍 Business lookup result:', {
      found: !!businessExists,
      business_name: businessExists?.business_name,
      error: businessCheckError
    });

    if (businessCheckError) {
      console.error('Error checking business existence:', businessCheckError);
      return res.status(500).json({ error: 'Error checking business' });
    }

    if (!businessExists) {
      return res.status(404).json({ 
        error: 'Business not found',
        business_id,
        message: 'The business ID does not exist in business_profiles table'
      });
    }

    // Fetch approved categories for this business with full category details
    const { data: approvedCategories, error: categoriesError } = await supabase
      .from('business_service_categories')
      .select(`
        id,
        business_id,
        category_id,
        is_active,
        created_at,
        updated_at,
        service_categories (
          id,
          service_category_type,
          description,
          image_url,
          sort_order,
          is_active
        )
      `)
      .eq('business_id', business_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching business service categories:', categoriesError);
      return res.status(500).json({ error: 'Failed to fetch service categories' });
    }

    console.log('🔍 Approved categories found:', {
      count: approvedCategories?.length || 0,
      categories: approvedCategories?.map((c: any) => ({
        category_id: c.category_id,
        category_name: c.service_categories?.service_category_type
      }))
    });

    // Fetch approved subcategories for this business with full details
    const { data: approvedSubcategories, error: subcategoriesError } = await supabase
      .from('business_service_subcategories')
      .select(`
        id,
        business_id,
        category_id,
        subcategory_id,
        is_active,
        created_at,
        updated_at,
        service_subcategories (
          id,
          category_id,
          service_subcategory_type,
          description,
          image_url,
          is_active
        )
      `)
      .eq('business_id', business_id)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (subcategoriesError) {
      console.error('Error fetching business service subcategories:', subcategoriesError);
      return res.status(500).json({ error: 'Failed to fetch service subcategories' });
    }

    console.log('🔍 Approved subcategories found:', {
      count: approvedSubcategories?.length || 0,
      subcategories: approvedSubcategories?.map((s: any) => ({
        subcategory_id: s.subcategory_id,
        category_id: s.category_id,
        subcategory_name: s.service_subcategories?.service_subcategory_type
      }))
    });

    // Organize the data: group subcategories under their parent categories
    const categoryMap = new Map();
    
    // First, add all approved categories
    approvedCategories?.forEach((item: any) => {
      const category = item.service_categories;
      if (category) {
        categoryMap.set(category.id, {
          category_id: category.id,
          category_name: category.service_category_type,
          description: category.description,
          image_url: category.image_url,
          sort_order: category.sort_order,
          is_active: category.is_active,
          approved_at: item.created_at,
          subcategories: [],
        });
      }
    });

    // Then, add subcategories to their parent categories
    approvedSubcategories?.forEach((item: any) => {
      const subcategory = item.service_subcategories;
      if (subcategory && item.category_id) {
        // Ensure parent category exists in map (in case subcategory was approved but not the parent)
        if (!categoryMap.has(item.category_id)) {
          categoryMap.set(item.category_id, {
            category_id: item.category_id,
            category_name: 'Unknown Category',
            description: null,
            image_url: null,
            sort_order: 999,
            is_active: true,
            approved_at: null,
            subcategories: [],
          });
        }

        const parentCategory = categoryMap.get(item.category_id);
        parentCategory.subcategories.push({
          subcategory_id: subcategory.id,
          subcategory_name: subcategory.service_subcategory_type,
          description: subcategory.description,
          image_url: subcategory.image_url,
          is_active: subcategory.is_active,
          approved_at: item.created_at,
        });
      }
    });

    // Convert map to array and sort by sort_order
    const approved_categories_display = Array.from(categoryMap.values())
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

    // Group subcategories by category for easy lookup
    const subcategories_by_category: Record<string, any[]> = {};
    approvedSubcategories?.forEach((item: any) => {
      if (item.category_id) {
        if (!subcategories_by_category[item.category_id]) {
          subcategories_by_category[item.category_id] = [];
        }
        subcategories_by_category[item.category_id].push(item);
      }
    });

    // Calculate stats
    const stats = {
      total_categories: categoryMap.size,
      total_subcategories: approvedSubcategories?.length || 0,
      categories_with_subcategories: Object.keys(subcategories_by_category).length,
      available_services_count: 0, // This would need a separate query to count services
      last_updated: null as number | null,
    };

    // Find most recent update
    const allDates = [
      ...(approvedCategories?.map((c: any) => c.updated_at) || []),
      ...(approvedSubcategories?.map((s: any) => s.updated_at) || []),
    ].filter(Boolean);
    
    if (allDates.length > 0) {
      const mostRecent = allDates.sort().reverse()[0];
      stats.last_updated = new Date(mostRecent).getTime();
    }

    // Return data in the format frontend expects
    return res.status(200).json({
      business_id,
      approved_categories: approvedCategories || [], // Return original structure with nested relations
      approved_subcategories: approvedSubcategories || [], // Return original structure
      subcategories_by_category, // Grouped for easy lookup
      stats,
      last_fetched: new Date().toISOString(),
      // For display/debugging
      _display: {
        categories: approved_categories_display, // The transformed display format
      },
      additional_info: (approvedCategories?.length || 0) === 0 
        ? 'No service categories have been approved for this business yet. Contact platform administration for approval.'
        : null,
    });

  } catch (error: any) {
    console.error('Unexpected error in service-eligibility handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
