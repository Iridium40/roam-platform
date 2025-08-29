import { RequestHandler } from "express";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL || 'https://vssomyuyhicaxsgiaupo.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZzc29teXV5aGljYXhzZ2lhdXBvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzQ1MzcxNSwiZXhwIjoyMDY5MDI5NzE1fQ.54i9VPExknTktnWbyT9Z9rZKvSJOjs9fG60wncLhLlA',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

interface BusinessServiceCategory {
  id: string;
  business_id: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_categories?: {
    id: string;
    service_category_type: string;
    description?: string;
    is_active: boolean;
  };
}

interface BusinessServiceSubcategory {
  id: string;
  business_id: string;
  subcategory_id: string;
  category_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  service_subcategories?: {
    id: string;
    service_subcategory_type: string;
    description?: string;
    category_id?: string;
    is_active: boolean;
    service_categories?: {
      id: string;
      service_category_type: string;
      description?: string;
      is_active: boolean;
    };
  };
  service_categories?: {
    id: string;
    service_category_type: string;
    description?: string;
    is_active: boolean;
  };
}

// GET /api/business/service-eligibility - Get approved service categories and subcategories for a business
export const getServiceEligibility: RequestHandler = async (req, res) => {
  try {
    const businessId = req.query.business_id as string;

    console.log('Service eligibility request received:', {
      businessId,
      query: req.query,
      hasSupabaseUrl: !!process.env.VITE_PUBLIC_SUPABASE_URL,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });

    if (!businessId) {
      console.error('Missing business_id parameter');
      return res.status(400).json({
        error: 'business_id parameter is required'
      });
    }

    // Test Supabase connection first
    try {
      const { data: testData, error: testError } = await supabaseAdmin
        .from('business_profiles')
        .select('id')
        .eq('id', businessId)
        .single();

      console.log('Supabase connection test:', {
        hasData: !!testData,
        error: testError?.message,
        businessExists: !!testData
      });

      if (testError && testError.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
        throw new Error(`Supabase connection failed: ${testError.message}`);
      }
    } catch (connectionError) {
      console.error('Supabase connection test failed:', connectionError);
      return res.status(500).json({
        error: 'Database connection failed',
        details: connectionError instanceof Error ? connectionError.message : 'Unknown error'
      });
    }

    console.log('Fetching service eligibility for business:', businessId);

    // Check if tables exist and fetch business service categories
    let businessCategories: any[] = [];
    try {
      const { data, error: categoriesError } = await supabaseAdmin
        .from('business_service_categories')
        .select(`
          id,
          business_id,
          category_id,
          is_active,
          created_at,
          updated_at,
          service_categories:category_id (
            id,
            service_category_type,
            description,
            is_active
          )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching business service categories:', categoriesError);

        // Check if table doesn't exist
        if (categoriesError.code === '42P01') {
          console.warn('business_service_categories table does not exist - returning empty results');
          businessCategories = [];
        } else {
          return res.status(500).json({
            error: 'Failed to fetch business service categories',
            details: categoriesError.message,
            code: categoriesError.code
          });
        }
      } else {
        businessCategories = data || [];
      }
    } catch (tableError) {
      console.error('Table access error for business_service_categories:', tableError);
      businessCategories = [];
    }

    console.log('Found business categories:', businessCategories?.length || 0);

    // Check if tables exist and fetch business service subcategories
    let businessSubcategories: any[] = [];
    try {
      const { data, error: subcategoriesError } = await supabaseAdmin
        .from('business_service_subcategories')
        .select(`
          id,
          business_id,
          subcategory_id,
          category_id,
          is_active,
          created_at,
          updated_at,
          service_subcategories:subcategory_id (
            id,
            service_subcategory_type,
            description,
            category_id,
            is_active,
            service_categories:category_id (
              id,
              service_category_type,
              description,
              is_active
            )
          ),
          service_categories:category_id (
            id,
            service_category_type,
            description,
            is_active
          )
        `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (subcategoriesError) {
        console.error('Error fetching business service subcategories:', subcategoriesError);

        // Check if table doesn't exist
        if (subcategoriesError.code === '42P01') {
          console.warn('business_service_subcategories table does not exist - returning empty results');
          businessSubcategories = [];
        } else {
          return res.status(500).json({
            error: 'Failed to fetch business service subcategories',
            details: subcategoriesError.message,
            code: subcategoriesError.code
          });
        }
      } else {
        businessSubcategories = data || [];
      }
    } catch (tableError) {
      console.error('Table access error for business_service_subcategories:', tableError);
      businessSubcategories = [];
    }

    console.log('Found business subcategories:', businessSubcategories?.length || 0);

    // If no categories or subcategories found, check if this is due to missing tables or just no data
    const hasAnyData = businessCategories.length > 0 || businessSubcategories.length > 0;

    if (!hasAnyData) {
      console.log('No service eligibility data found for business. This may be normal if no categories have been assigned yet.');
    }

    // Group subcategories by category for better organization
    const subcategoriesByCategory: Record<string, any[]> = {};
    (businessSubcategories || []).forEach((subcategory: BusinessServiceSubcategory) => {
      const categoryId = subcategory.category_id;
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(subcategory);
    });

    // Calculate summary statistics
    const stats = {
      total_categories: businessCategories?.length || 0,
      total_subcategories: businessSubcategories?.length || 0,
      categories_with_subcategories: Object.keys(subcategoriesByCategory).length,
      last_updated: businessCategories && businessCategories.length > 0 
        ? Math.max(...businessCategories.map(cat => new Date(cat.updated_at).getTime()))
        : null
    };

    // Get the count of available services for this business based on approved categories
    let availableServicesCount = 0;
    if (businessSubcategories && businessSubcategories.length > 0) {
      const subcategoryIds = businessSubcategories.map(bs => bs.subcategory_id);
      
      const { count: servicesCount, error: servicesCountError } = await supabaseAdmin
        .from('services')
        .select('id', { count: 'exact', head: true })
        .in('subcategory_id', subcategoryIds)
        .eq('is_active', true);

      if (!servicesCountError && servicesCount !== null) {
        availableServicesCount = servicesCount;
      } else if (servicesCountError) {
        console.warn('Error counting available services:', servicesCountError);
      }
    }

    const responseData = {
      business_id: businessId,
      approved_categories: businessCategories || [],
      approved_subcategories: businessSubcategories || [],
      subcategories_by_category: subcategoriesByCategory,
      stats: {
        ...stats,
        available_services_count: availableServicesCount
      },
      last_fetched: new Date().toISOString(),
      // Add debug info for development
      _debug: {
        tables_checked: true,
        categories_table_accessible: businessCategories !== null,
        subcategories_table_accessible: businessSubcategories !== null,
        has_data: hasAnyData
      }
    };

    console.log('Sending service eligibility response:', {
      businessId,
      categoriesCount: responseData.approved_categories.length,
      subcategoriesCount: responseData.approved_subcategories.length,
      availableServicesCount
    });

    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error in getServiceEligibility:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
