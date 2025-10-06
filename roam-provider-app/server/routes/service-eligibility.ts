import { RequestHandler } from "express";
import { createClient } from '@supabase/supabase-js';

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = [
    'VITE_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
}

// Validate environment on startup
validateEnvironment();

// Initialize Supabase admin client
const supabaseAdmin = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
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

    // Helper function to format names: convert snake_case to Title Case
    const formatName = (name: string): string => {
      if (!name) return 'Unknown';
      
      // Special cases for common abbreviations
      const specialCases: Record<string, string> = {
        'iv': 'IV',
        'cpr': 'CPR',
        'bls': 'BLS',
        'acls': 'ACLS',
        'emt': 'EMT',
        'rn': 'RN',
        'lpn': 'LPN',
        'md': 'MD',
        'do': 'DO',
        'np': 'NP',
        'pa': 'PA'
      };
      
      return name
        .split('_')
        .map(word => {
          const lowerWord = word.toLowerCase();
          // Check if this word is a special case
          if (specialCases[lowerWord]) {
            return specialCases[lowerWord];
          }
          // Otherwise, capitalize first letter
          return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join(' ');
    };

    // Flatten and transform categories with their names
    const transformedCategories = (businessCategories || []).map((category: any) => {
      const rawName = category.service_categories?.service_category_type || 'Unknown Category';
      return {
        id: category.id,
        business_id: category.business_id,
        category_id: category.category_id,
        category_name: formatName(rawName),
        service_category_type: formatName(rawName),
        description: category.service_categories?.description || null,
        is_active: category.is_active,
        created_at: category.created_at,
        updated_at: category.updated_at
      };
    });

    // Flatten and transform subcategories with their names
    const transformedSubcategories = (businessSubcategories || []).map((subcategory: any) => {
      const rawSubcategoryName = subcategory.service_subcategories?.service_subcategory_type || 'Unknown Subcategory';
      const rawCategoryName = subcategory.service_categories?.service_category_type || 
                              subcategory.service_subcategories?.service_categories?.service_category_type || 
                              'Unknown Category';
      
      return {
        id: subcategory.id,
        business_id: subcategory.business_id,
        subcategory_id: subcategory.subcategory_id,
        subcategory_name: formatName(rawSubcategoryName),
        service_subcategory_type: formatName(rawSubcategoryName),
        category_id: subcategory.category_id,
        category_name: formatName(rawCategoryName),
        description: subcategory.service_subcategories?.description || null,
        is_active: subcategory.is_active,
        created_at: subcategory.created_at,
        updated_at: subcategory.updated_at
      };
    });

    // Group subcategories by category for better organization
    const subcategoriesByCategory: Record<string, any[]> = {};
    transformedSubcategories.forEach((subcategory: any) => {
      const categoryId = subcategory.category_id;
      if (!subcategoriesByCategory[categoryId]) {
        subcategoriesByCategory[categoryId] = [];
      }
      subcategoriesByCategory[categoryId].push(subcategory);
    });

    // Add subcategories to their parent categories
    const categoriesWithSubcategories = transformedCategories.map((category: any) => ({
      ...category,
      subcategories: subcategoriesByCategory[category.category_id] || []
    }));

    // Calculate summary statistics
    const stats = {
      total_categories: transformedCategories.length,
      total_subcategories: transformedSubcategories.length,
      categories_with_subcategories: Object.keys(subcategoriesByCategory).length,
      last_updated: transformedCategories.length > 0 
        ? Math.max(...transformedCategories.map(cat => new Date(cat.updated_at).getTime()))
        : null
    };

    // Get the count of available services for this business based on approved categories
    let availableServicesCount = 0;
    if (transformedSubcategories.length > 0) {
      const subcategoryIds = transformedSubcategories.map(bs => bs.subcategory_id);
      
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
      approved_categories: categoriesWithSubcategories,
      approved_subcategories: transformedSubcategories,
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
      availableServicesCount,
      sampleCategory: responseData.approved_categories[0]
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
