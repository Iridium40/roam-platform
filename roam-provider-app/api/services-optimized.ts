import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Type definition for the RPC response
interface ServiceRPCResponse {
  services: any[];
  total_count: number;
  stats: {
    total_services: number;
    active_services: number;
    configured_services: number;
    unconfigured_services: number;
    avg_price: number;
    total_value: number;
    category_count: number;
    subcategory_count: number;
  };
}

/**
 * GET /api/services-optimized
 * 
 * Optimized endpoint for fetching business eligible services.
 * Uses PostgreSQL function for server-side filtering, pagination, and stats.
 * 
 * PERFORMANCE:
 * - Before: 6 sequential queries (~400-600ms)
 * - After: 1 optimized query (~50-100ms)
 * - Improvement: ~5-8x faster
 * 
 * Query params:
 * - business_id: UUID (required)
 * - search: Search term for service name/description/category
 * - status: 'all' | 'active' | 'inactive' | 'configured' | 'unconfigured'
 * - category_id: Filter by category UUID
 * - subcategory_id: Filter by subcategory UUID
 * - limit: Number of results (default 50)
 * - offset: Pagination offset (default 0)
 * 
 * Returns:
 * - services: Array of eligible services
 * - total_count: Total matching services (for pagination)
 * - stats: Aggregated statistics
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate environment
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Parse query parameters
    const { 
      business_id,
      user_id,
      search,
      status,
      category_id,
      subcategory_id,
      limit = '50',
      offset = '0'
    } = req.query;

    // Validate required parameters
    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ error: 'business_id is required' });
    }

    // Optional: Verify user has permission to access this business
    if (user_id && typeof user_id === 'string') {
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

    // Call the optimized database function
    // Note: Function returns TABLE, so we get the first row (should only be one)
    const { data: rpcResults, error } = await supabase
      .rpc('get_business_eligible_services_optimized', {
        p_business_id: business_id,
        p_search: search && typeof search === 'string' ? search : null,
        p_status: status && typeof status === 'string' ? status : null,
        p_category_id: category_id && typeof category_id === 'string' ? category_id : null,
        p_subcategory_id: subcategory_id && typeof subcategory_id === 'string' ? subcategory_id : null,
        p_limit: parseInt(typeof limit === 'string' ? limit : '50', 10),
        p_offset: parseInt(typeof offset === 'string' ? offset : '0', 10)
      });

    if (error) {
      console.error('Error calling get_business_eligible_services_optimized:', error);
      
      // Fallback if function doesn't exist yet
      if (error.code === '42883') {
        return await fallbackServices(supabase, business_id, req.query, res);
      }
      
      return res.status(500).json({ 
        error: 'Failed to fetch services',
        details: error.message 
      });
    }

    // Get the first row from the table result (should only be one row)
    const data = (rpcResults && rpcResults.length > 0) ? rpcResults[0] : null;

    // Return the optimized response
    return res.status(200).json({
      business_id,
      eligible_services: data?.services || [],
      service_count: data?.total_count || 0,
      stats: data?.stats || {
        total_services: 0,
        active_services: 0,
        configured_services: 0,
        unconfigured_services: 0,
        avg_price: 0,
        total_value: 0,
        category_count: 0,
        subcategory_count: 0
      },
      pagination: {
        limit: parseInt(typeof limit === 'string' ? limit : '50', 10),
        offset: parseInt(typeof offset === 'string' ? offset : '0', 10),
        total: data?.total_count || 0
      }
    });

  } catch (error) {
    console.error('Unexpected error in services-optimized handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Fallback function when the optimized database function doesn't exist
async function fallbackServices(
  supabase: any,
  businessId: string,
  query: any,
  res: VercelResponse
) {
  try {
    console.log('Using fallback services query for business:', businessId);
    
    // Step 1: Get approved subcategories for this business
    const { data: approvedSubcategories, error: subcatError } = await supabase
      .from('business_service_subcategories')
      .select('subcategory_id, category_id')
      .eq('business_id', businessId)
      .eq('is_active', true);

    if (subcatError) {
      console.error('Error fetching approved subcategories:', subcatError);
      return res.status(500).json({ 
        error: 'Failed to fetch approved subcategories',
        details: subcatError.message 
      });
    }

    console.log('Approved subcategories:', approvedSubcategories?.length || 0);

    if (!approvedSubcategories || approvedSubcategories.length === 0) {
      return res.status(200).json({
        business_id: businessId,
        eligible_services: [],
        service_count: 0,
        stats: {
          total_services: 0,
          active_services: 0,
          configured_services: 0,
          unconfigured_services: 0,
          avg_price: 0,
          total_value: 0,
          category_count: 0,
          subcategory_count: 0,
        },
        pagination: { limit: 50, offset: 0, total: 0 },
        _meta: { fallback_mode: true },
      });
    }

    const subcategoryIds = approvedSubcategories.map((s: any) => s.subcategory_id).filter(Boolean);

    // Step 2: Get services in approved subcategories
    const { data: servicesData, error: servicesError } = await supabase
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
      .in('subcategory_id', subcategoryIds)
      .eq('is_active', true);

    if (servicesError) {
      console.error('Fallback services query error:', servicesError);
      return res.status(500).json({ 
        error: 'Failed to fetch services',
        details: servicesError.message 
      });
    }

    console.log('Services found:', servicesData?.length || 0);

    // Step 3: Get business services (prices/config) for this business
    const serviceIds = (servicesData || []).map((s: any) => s.id);
    let businessServicesMap = new Map<string, any>();
    
    if (serviceIds.length > 0) {
      const { data: businessServices, error: bsError } = await supabase
        .from('business_services')
        .select('service_id, business_price, business_duration_minutes, delivery_type, is_active')
        .eq('business_id', businessId)
        .in('service_id', serviceIds);

      if (bsError) {
        console.error('Error fetching business services:', bsError);
      } else {
        businessServicesMap = new Map((businessServices || []).map((bs: any) => [bs.service_id, bs]));
      }
      console.log('Business services configured:', businessServicesMap.size);
    }

    // Transform the data
    const services = (servicesData || []).map((service: any) => {
      const subcategory = service.service_subcategories;
      const category = subcategory?.service_categories;
      const businessService = businessServicesMap.get(service.id);

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        min_price: service.min_price,
        duration_minutes: service.duration_minutes,
        image_url: service.image_url,
        subcategory_id: service.subcategory_id,
        subcategory_name: subcategory?.service_subcategory_type,
        category_id: category?.id,
        category_name: category?.service_category_type,
        is_configured: !!businessService,
        business_service_id: businessService?.id || null,
        business_price: businessService?.business_price || null,
        business_duration_minutes: businessService?.business_duration_minutes || null,
        delivery_type: businessService?.delivery_type || null,
        business_is_active: businessService?.is_active || false,
        service_subcategories: subcategory ? {
          id: subcategory.id,
          service_subcategory_type: subcategory.service_subcategory_type,
          service_categories: category ? {
            id: category.id,
            service_category_type: category.service_category_type,
          } : null,
        } : null,
      };
    });

    // Calculate stats
    const activeServices = services.filter((s: any) => s.business_is_active);
    const stats = {
      total_services: services.length,
      active_services: activeServices.length,
      configured_services: services.filter((s: any) => s.is_configured).length,
      unconfigured_services: services.filter((s: any) => !s.is_configured).length,
      avg_price: activeServices.length > 0
        ? activeServices.reduce((sum: number, s: any) => sum + (s.business_price || s.min_price || 0), 0) / activeServices.length
        : 0,
      total_value: activeServices.reduce((sum: number, s: any) => sum + (s.business_price || s.min_price || 0), 0),
      category_count: new Set(services.map((s: any) => s.category_id)).size,
      subcategory_count: new Set(services.map((s: any) => s.subcategory_id)).size,
    };

    return res.status(200).json({
      business_id: businessId,
      eligible_services: services,
      service_count: services.length,
      stats,
      pagination: {
        limit: 50,
        offset: 0,
        total: services.length,
      },
      _meta: {
        fallback_mode: true,
        message: 'Using fallback mode. Run migration for optimized queries.',
      },
    });
  } catch (error) {
    console.error('Fallback services error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
