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
    const { subcategoryId, searchQuery, location } = req.query;

    if (!subcategoryId && !searchQuery) {
      return res.status(400).json({ error: 'Either subcategoryId or searchQuery is required' });
    }

    // Parse location (lat,long format)
    let centerLat: number | null = null;
    let centerLng: number | null = null;
    if (location && typeof location === 'string') {
      const [lat, lng] = location.split(',').map(Number);
      if (!isNaN(lat) && !isNaN(lng)) {
        centerLat = lat;
        centerLng = lng;
      }
    }

    // Default radius in miles (can be made configurable)
    const SEARCH_RADIUS_MILES = 50; // 50 mile radius

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
      const searchTerm = (searchQuery as string).toLowerCase().trim();
      const allBusinessIds = new Set<string>();

      // 1. Search by business name
      const { data: businessNameResults, error: businessNameError } = await supabase
        .from('business_profiles')
        .select('id')
        .ilike('business_name', `%${searchTerm}%`)
        .eq('is_active', true)
        .eq('verification_status', 'approved')
        .eq('bank_connected', true)
        .not('stripe_account_id', 'is', null)
        .limit(100);

      if (businessNameError) {
        console.error('Error searching businesses by name:', businessNameError);
      } else {
        businessNameResults?.forEach(b => allBusinessIds.add(b.id));
      }

      // 2. Search by service name (find services with search term in name)
      const { data: serviceResults, error: serviceError } = await supabase
        .from('services')
        .select(`
          id,
          business_services!inner(
            business_id
          )
        `)
        .ilike('name', `%${searchTerm}%`)
        .eq('is_active', true)
        .eq('business_services.is_active', true);

      if (serviceError) {
        console.error('Error searching services:', serviceError);
      } else {
        serviceResults?.forEach((service: any) => {
          if (service.business_services && Array.isArray(service.business_services)) {
            service.business_services.forEach((bs: any) => {
              if (bs.business_id) {
                allBusinessIds.add(bs.business_id);
              }
            });
          }
        });
      }

      // 3. Search by subcategory type (e.g., "massage_therapy" for "massage")
      // Check if search term matches subcategory types
      const subcategoryTypeMap: Record<string, string[]> = {
        'massage': ['massage_therapy'],
        'therapy': ['massage_therapy', 'physical_therapy', 'iv_therapy'],
        'yoga': ['yoga_instructor'],
        'trainer': ['personal_trainer'],
        'hair': ['hair_and_makeup'],
        'makeup': ['hair_and_makeup'],
        'physician': ['physician'],
        'nurse': ['nurse_practitioner'],
        'chiropractor': ['chiropractor'],
        'esthetician': ['esthetician'],
        'tan': ['spray_tan'],
        'coach': ['health_coach'],
        'injectables': ['injectables'],
        'pilates': ['pilates_instructor'],
      };

      // Find matching subcategory types
      const matchingSubcategoryTypes: string[] = [];
      for (const [key, types] of Object.entries(subcategoryTypeMap)) {
        if (searchTerm.includes(key) || types.some(type => searchTerm.includes(type.replace('_', ' ')))) {
          matchingSubcategoryTypes.push(...types);
        }
      }

      // Also check if search term directly matches a subcategory type (e.g., "massage_therapy")
      const normalizedSearchTerm = searchTerm.replace(/\s+/g, '_');
      if (subcategoryTypeMap[normalizedSearchTerm]) {
        matchingSubcategoryTypes.push(...subcategoryTypeMap[normalizedSearchTerm]);
      }

      // Query businesses with matching subcategories
      if (matchingSubcategoryTypes.length > 0) {
        // First, get subcategory IDs for the matching types
        const { data: subcategoryIds, error: subcatIdsError } = await supabase
          .from('service_subcategories')
          .select('id')
          .in('service_subcategory_type', matchingSubcategoryTypes)
          .eq('is_active', true);

        if (subcatIdsError) {
          console.error('Error fetching subcategory IDs:', subcatIdsError);
        } else if (subcategoryIds && subcategoryIds.length > 0) {
          const subcatIds = subcategoryIds.map(sc => sc.id);
          
          // Then find businesses with these subcategories
          const { data: subcategoryResults, error: subcategoryError } = await supabase
            .from('business_service_subcategories')
            .select('business_id')
            .in('subcategory_id', subcatIds)
            .eq('is_active', true);

          if (subcategoryError) {
            console.error('Error searching by subcategory:', subcategoryError);
          } else {
            subcategoryResults?.forEach((bs: any) => {
              if (bs.business_id) {
                allBusinessIds.add(bs.business_id);
              }
            });
          }
        }
      }

      // Convert Set to Array
      businessIds = Array.from(allBusinessIds);
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
        business_description,
        logo_url,
        image_url,
        is_active,
        verification_status,
        bank_connected,
        stripe_account_id,
        business_locations (
          id,
          location_name,
          address_line1,
          city,
          state,
          postal_code,
          latitude,
          longitude,
          offers_mobile_services,
          mobile_service_radius
        ),
        providers!inner (
          id,
          provider_role,
          is_active,
          active_for_bookings
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
      .eq('is_active', true)
      .eq('verification_status', 'approved')
      .eq('bank_connected', true)
      .not('stripe_account_id', 'is', null)
      .eq('providers.is_active', true)
      .eq('providers.provider_services.is_active', true)
      .in('providers.provider_role', ['owner', 'provider']);

    if (businessesError) {
      console.error('Error fetching businesses:', businessesError);
      return res.status(500).json({ error: 'Failed to fetch businesses', details: businessesError.message });
    }

    // Calculate ratings and review counts for each business
    const businessesWithRatings = await Promise.all(
      (businesses || []).map(async (business: any) => {
        // Get reviews for this business via bookings
        const { data: bookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('business_id', business.id);

        const bookingIds = bookings?.map(b => b.id) || [];
        
        let rating = 0;
        let review_count = 0;

        if (bookingIds.length > 0) {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('overall_rating')
            .in('booking_id', bookingIds);

          if (reviews && reviews.length > 0) {
            review_count = reviews.length;
            const sum = reviews.reduce((acc: number, r: any) => acc + (r.overall_rating || 0), 0);
            rating = sum / review_count;
          }
        }

        return {
          ...business,
          rating: Math.round(rating * 10) / 10, // Round to 1 decimal place
          review_count
        };
      })
    );

    // Filter businesses by location proximity if location is provided
    let filteredBusinesses = businessesWithRatings || [];
    if (centerLat !== null && centerLng !== null && filteredBusinesses.length > 0) {
      // Helper function to calculate distance between two coordinates using Haversine formula
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
      };

      filteredBusinesses = filteredBusinesses.filter((business: any) => {
        // Check if business has any location within radius
        if (business.business_locations && Array.isArray(business.business_locations)) {
          for (const location of business.business_locations) {
            if (location.latitude && location.longitude) {
              const distance = calculateDistance(
                centerLat!,
                centerLng!,
                location.latitude,
                location.longitude
              );
              
              // Include if location is within search radius
              if (distance <= SEARCH_RADIUS_MILES) {
                return true;
              }
              
              // Include if business offers mobile services and location is within mobile service radius
              if (location.offers_mobile_services && location.mobile_service_radius) {
                if (distance <= location.mobile_service_radius) {
                  return true;
                }
              }
            }
          }
        }
        
        // If no locations found, exclude the business (or you could include it if you want)
        return false;
      });

      // Sort businesses by distance (closest first)
      filteredBusinesses = filteredBusinesses.map((business: any) => {
        let minDistance = Infinity;
        if (business.business_locations && Array.isArray(business.business_locations)) {
          for (const location of business.business_locations) {
            if (location.latitude && location.longitude) {
              const distance = calculateDistance(
                centerLat!,
                centerLng!,
                location.latitude,
                location.longitude
              );
              minDistance = Math.min(minDistance, distance);
            }
          }
        }
        return { ...business, _distance: minDistance };
      }).sort((a: any, b: any) => a._distance - b._distance);
    }

    // Fetch services for the subcategory if provided, or services matching search query
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
    } else if (searchQuery) {
      // Fetch services matching the search query
      const searchTerm = (searchQuery as string).toLowerCase().trim();
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select(`
          id,
          name,
          description,
          min_price,
          duration_minutes,
          service_subcategories(
            id,
            service_subcategory_type
          )
        `)
        .ilike('name', `%${searchTerm}%`)
        .eq('is_active', true)
        .limit(50);

      if (servicesError) {
        console.error('Error fetching services by search:', servicesError);
        // Don't fail the request if services fetch fails
      } else {
        services = servicesData || [];
      }
    }

    return res.status(200).json({ 
      businesses: filteredBusinesses,
      services: services,
      centerLocation: centerLat !== null && centerLng !== null ? { lat: centerLat, lng: centerLng } : null
    });

  } catch (error: any) {
    console.error('Error in businesses/search:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message 
    });
  }
}

