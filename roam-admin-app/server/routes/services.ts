import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleServices(req: Request, res: Response) {
  try {
    console.log('[handleServices] Request received:', req.method, req.url);
    console.log('[handleServices] Params:', req.params);
    
    switch (req.method) {
      case 'GET':
        return await getServices(req, res);
      case 'POST':
        return await createService(req, res);
      case 'PUT':
        return await updateService(req, res);
      case 'DELETE':
        return await deleteService(req, res);
      default:
        console.warn('[handleServices] Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in services API:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

// Get all service-related data (services, categories, subcategories, addons, eligibility)
export async function handleAllServiceData(req: Request, res: Response) {
  try {
    console.log('[handleAllServiceData] Starting to fetch all service data...');
    
    // Fetch all data in parallel
    const [
      servicesResult,
      categoriesResult,
      subcategoriesResult,
      addonsResult,
      addonEligibilityResult,
    ] = await Promise.all([
      // Services with subcategory and category joins
      supabase
        .from("services")
        .select(`
          *,
          service_subcategories (
            service_subcategory_type,
            service_categories (
              service_category_type
            )
          )
        `)
        .order("created_at", { ascending: false }),

      // Categories
      supabase
        .from("service_categories")
        .select("*")
        .order("sort_order", { ascending: true }),

      // Subcategories with category join
      supabase
        .from("service_subcategories")
        .select(`
          *,
          service_categories (
            service_category_type
          )
        `)
        .order("created_at", { ascending: false }),

      // Service addons
      supabase
        .from("service_addons")
        .select("*")
        .order("created_at", { ascending: false }),

      // Service addon eligibility relationships
      supabase
        .from("service_addon_eligibility")
        .select(`
          *,
          services (
            name
          ),
          service_addons (
            name
          )
        `)
        .order("created_at", { ascending: false }),
    ]);

    // Check for errors with detailed logging
    const errors: string[] = [];
    if (servicesResult.error) {
      console.error('[handleAllServiceData] Services error:', servicesResult.error);
      errors.push(`services: ${servicesResult.error.message}`);
    }
    if (categoriesResult.error) {
      console.error('[handleAllServiceData] Categories error:', categoriesResult.error);
      errors.push(`categories: ${categoriesResult.error.message}`);
    }
    if (subcategoriesResult.error) {
      console.error('[handleAllServiceData] Subcategories error:', subcategoriesResult.error);
      errors.push(`subcategories: ${subcategoriesResult.error.message}`);
    }
    if (addonsResult.error) {
      console.error('[handleAllServiceData] Addons error:', addonsResult.error);
      errors.push(`addons: ${addonsResult.error.message}`);
    }
    if (addonEligibilityResult.error) {
      console.error('[handleAllServiceData] Addon eligibility error:', addonEligibilityResult.error);
      errors.push(`addonEligibility: ${addonEligibilityResult.error.message}`);
    }

    if (errors.length > 0) {
      console.error('[handleAllServiceData] Database errors:', errors);
      return res.status(500).json({ 
        success: false, 
        error: 'Database query errors',
        details: errors
      });
    }

    console.log('[handleAllServiceData] Successfully fetched:', {
      services: servicesResult.data?.length || 0,
      categories: categoriesResult.data?.length || 0,
      subcategories: subcategoriesResult.data?.length || 0,
      addons: addonsResult.data?.length || 0,
      addonEligibility: addonEligibilityResult.data?.length || 0,
    });

    res.json({
      success: true,
      data: {
        services: servicesResult.data || [],
        categories: categoriesResult.data || [],
        subcategories: subcategoriesResult.data || [],
        addons: addonsResult.data || [],
        addonEligibility: addonEligibilityResult.data || [],
      }
    });
  } catch (error) {
    console.error('[handleAllServiceData] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch service data',
      details: errorMessage
    });
  }
}

async function getServices(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch services' 
    });
  }
}

async function createService(req: Request, res: Response) {
  try {
    const {
      name,
      description,
      subcategory_id,
      min_price,
      duration_minutes,
      image_url,
      is_active = true,
      is_featured = false,
      is_popular = false,
      pricing_type = 'fixed'
    } = req.body;

    // Validate required fields
    if (!name || !subcategory_id) {
      return res.status(400).json({ 
        success: false,
        error: 'name and subcategory_id are required' 
      });
    }

    const { data, error } = await supabase
      .from('services')
      .insert([{
        name,
        description,
        subcategory_id,
        min_price: parseFloat(min_price) || 0,
        duration_minutes: parseInt(duration_minutes) || 60,
        image_url,
        is_active,
        is_featured,
        is_popular,
        pricing_type
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create service' 
    });
  }
}

async function updateService(req: Request, res: Response) {
  try {
    console.log('[updateService] PUT request received');
    console.log('[updateService] URL:', req.url);
    console.log('[updateService] Params:', req.params);
    console.log('[updateService] Body:', req.body);
    
    // Extract ID from URL path (e.g., /api/services/:id)
    const serviceId = req.params?.id || req.body?.id;
    
    if (!serviceId) {
      console.error('[updateService] Missing service ID');
      return res.status(400).json({ 
        success: false,
        error: 'Service ID is required' 
      });
    }

    console.log('[updateService] Updating service:', serviceId);

    const {
      name,
      description,
      subcategory_id,
      min_price,
      duration_minutes,
      image_url,
      is_active,
      is_featured,
      is_popular,
      pricing_type
    } = req.body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (subcategory_id !== undefined) updateData.subcategory_id = subcategory_id;
    if (min_price !== undefined) updateData.min_price = parseFloat(min_price);
    if (duration_minutes !== undefined) updateData.duration_minutes = parseInt(duration_minutes);
    if (image_url !== undefined) updateData.image_url = image_url;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (is_featured !== undefined) updateData.is_featured = is_featured;
    if (is_popular !== undefined) updateData.is_popular = is_popular;
    if (pricing_type !== undefined) updateData.pricing_type = pricing_type;

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', serviceId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update service' 
    });
  }
}

async function deleteService(req: Request, res: Response) {
  try {
    const serviceId = req.params?.id || req.body?.id;
    if (!serviceId) {
      return res.status(400).json({ 
        success: false,
        error: 'Service ID is required' 
      });
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'Service deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete service' 
    });
  }
}

