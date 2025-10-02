import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/business/service-eligibility
 * 
 * Fetches approved service categories and subcategories for a business
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
    const approved_categories = Array.from(categoryMap.values())
      .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));

    // Calculate stats
    const stats = {
      total_categories: categoryMap.size,
      total_subcategories: approvedSubcategories?.length || 0,
    };

    // Find most recent update
    const allDates = [
      ...(approvedCategories?.map((c: any) => c.updated_at) || []),
      ...(approvedSubcategories?.map((s: any) => s.updated_at) || []),
    ].filter(Boolean);
    
    const last_updated = allDates.length > 0 
      ? allDates.sort().reverse()[0] 
      : null;

    // Return organized data
    return res.status(200).json({
      business_id,
      approved_categories,
      stats,
      last_updated,
      additional_info: approved_categories.length === 0 
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
