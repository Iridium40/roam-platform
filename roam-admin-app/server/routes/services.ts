import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleServices(req: Request, res: Response) {
  try {
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
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in services API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
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
      is_popular = false
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
        is_popular
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
    const serviceId = req.params?.id || req.body?.id;
    if (!serviceId) {
      return res.status(400).json({ 
        success: false,
        error: 'Service ID is required' 
      });
    }

    const {
      name,
      description,
      subcategory_id,
      min_price,
      duration_minutes,
      image_url,
      is_active,
      is_featured,
      is_popular
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

