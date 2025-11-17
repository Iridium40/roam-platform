import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { subcategoryId, searchQuery } = req.query;

    if (!subcategoryId && !searchQuery) {
      return res.status(400).json({ error: 'Either subcategoryId or searchQuery is required' });
    }

    let businessIds: string[] = [];

    if (subcategoryId) {
      // Fetch businesses by subcategory
      const { data: businessSubcategories, error: subcatError } = await supabase
        .from('business_service_subcategories')
        .select(`
          business_id,
          service_subcategories!inner(
            id,
            service_subcategory_type
          )
        `)
        .eq('subcategory_id', subcategoryId as string)
        .eq('is_active', true);

      if (subcatError) {
        console.error('Error fetching business subcategories:', subcatError);
        return res.status(500).json({ error: 'Failed to fetch business subcategories', details: subcatError.message });
      }

      businessIds = businessSubcategories?.map(bs => bs.business_id) || [];
    } else if (searchQuery) {
      // Search by business name
      const { data: searchResults, error: searchError } = await supabase
        .from('business_profiles')
        .select('id')
        .ilike('business_name', `%${searchQuery}%`)
        .eq('is_active', true)
        .limit(100);

      if (searchError) {
        console.error('Error searching businesses:', searchError);
        return res.status(500).json({ error: 'Failed to search businesses', details: searchError.message });
      }

      businessIds = searchResults?.map(b => b.id) || [];
    }

    if (businessIds.length === 0) {
      return res.status(200).json({ businesses: [], services: [] });
    }

    // Fetch businesses with full details including locations
    const { data: businesses, error: businessesError } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        description,
        logo_url,
        image_url,
        rating,
        review_count,
        is_active,
        business_locations (
          id,
          location_name,
          address_line1,
          city,
          state,
          postal_code,
          latitude,
          longitude
        ),
        business_service_subcategories (
          id,
          subcategory_id,
          service_subcategories (
            id,
            service_subcategory_type
          )
        )
      `)
      .in('id', businessIds)
      .eq('is_active', true);

    if (businessesError) {
      console.error('Error fetching businesses:', businessesError);
      return res.status(500).json({ error: 'Failed to fetch businesses', details: businessesError.message });
    }

    // Fetch services for the subcategory if provided
    let services: any[] = [];
    if (subcategoryId) {
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          description,
          min_price,
          duration_minutes,
          service_subcategories!inner(
            id,
            service_subcategory_type
          )
        `)
        .eq('service_subcategories.id', subcategoryId as string)
        .eq('is_active', true);

      if (servicesError) {
        console.error('Error fetching services:', servicesError);
        // Don't fail the request if services fetch fails
      } else {
        services = servicesData || [];
      }
    }

    return res.status(200).json({ 
      businesses: businesses || [],
      services: services
    });

  } catch (error: any) {
    console.error('Error in businesses/search:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

