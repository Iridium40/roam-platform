import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

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
    category_description?: string;
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
    subcategory_description?: string;
    is_active: boolean;
  };
  service_categories?: {
    id: string;
    service_category_type: string;
    category_description?: string;
    is_active: boolean;
  };
}

// GET /api/business/service-eligibility - Get approved service categories and subcategories for a business
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get('business_id');

    if (!businessId) {
      return NextResponse.json(
        { error: 'business_id parameter is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch business service categories
    const { data: businessCategories, error: categoriesError } = await supabaseAdmin
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
          category_description,
          is_active
        )
      `)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (categoriesError) {
      console.error('Error fetching business service categories:', categoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch business service categories', details: categoriesError.message },
        { status: 500, headers: corsHeaders }
      );
    }

    // Fetch business service subcategories
    const { data: businessSubcategories, error: subcategoriesError } = await supabaseAdmin
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
          subcategory_description,
          is_active
        ),
        service_categories:category_id (
          id,
          service_category_type,
          category_description,
          is_active
        )
      `)
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (subcategoriesError) {
      console.error('Error fetching business service subcategories:', subcategoriesError);
      return NextResponse.json(
        { error: 'Failed to fetch business service subcategories', details: subcategoriesError.message },
        { status: 500, headers: corsHeaders }
      );
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
      }
    }

    return NextResponse.json({
      business_id: businessId,
      approved_categories: businessCategories || [],
      approved_subcategories: businessSubcategories || [],
      subcategories_by_category: subcategoriesByCategory,
      stats: {
        ...stats,
        available_services_count: availableServicesCount
      },
      last_fetched: new Date().toISOString()
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Error in GET /api/business/service-eligibility:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse('ok', { headers: corsHeaders });
}
