import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleBusinessServices(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getBusinessServices(req, res);
      case 'POST':
        return await createBusinessService(req, res);
      case 'PUT':
        return await updateBusinessService(req, res);
      case 'DELETE':
        return await deleteBusinessService(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in business services API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getBusinessServices(req: Request, res: Response) {
  try {
    const { business_id } = req.query;

    let query = supabase
      .from('business_services')
      .select(`
        id,
        business_id,
        service_id,
        business_price,
        business_duration_minutes,
        is_active,
        created_at,
        delivery_type,
        services (
          id,
          name,
          duration_minutes,
          min_price,
          description
        )
      `)
      .order('created_at', { ascending: false });

    if (business_id) {
      query = query.eq('business_id', business_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching business services:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(200).json({ 
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('Error in getBusinessServices:', error);
    return res.status(500).json({ error: 'Failed to fetch business services' });
  }
}

async function createBusinessService(req: Request, res: Response) {
  try {
    const serviceData = req.body;

    const { data, error } = await supabase
      .from('business_services')
      .insert([serviceData])
      .select(`
        id,
        business_id,
        service_id,
        business_price,
        business_duration_minutes,
        is_active,
        created_at,
        delivery_type,
        services (
          id,
          name,
          duration_minutes,
          min_price,
          description
        )
      `)
      .single();

    if (error) {
      console.error('Error creating business service:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(201).json({ 
      success: true,
      data 
    });

  } catch (error) {
    console.error('Error in createBusinessService:', error);
    return res.status(500).json({ error: 'Failed to create business service' });
  }
}

async function updateBusinessService(req: Request, res: Response) {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Business service ID is required' });
    }

    const { data, error } = await supabase
      .from('business_services')
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        business_id,
        service_id,
        business_price,
        business_duration_minutes,
        is_active,
        created_at,
        delivery_type,
        services (
          id,
          name,
          duration_minutes,
          min_price,
          description
        )
      `)
      .single();

    if (error) {
      console.error('Error updating business service:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(200).json({ 
      success: true,
      data 
    });

  } catch (error) {
    console.error('Error in updateBusinessService:', error);
    return res.status(500).json({ error: 'Failed to update business service' });
  }
}

async function deleteBusinessService(req: Request, res: Response) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Business service ID is required' });
    }

    const { error } = await supabase
      .from('business_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting business service:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Business service deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteBusinessService:', error);
    return res.status(500).json({ error: 'Failed to delete business service' });
  }
}

