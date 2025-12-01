import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleBusinessLocations(req: Request, res: Response) {
  try {
    console.log(`[business-locations] ${req.method} request received`);
    
    switch (req.method) {
      case 'GET':
        return await getBusinessLocations(req, res);
      case 'POST':
        return await createBusinessLocation(req, res);
      case 'PUT':
        return await updateBusinessLocation(req, res);
      case 'DELETE':
        return await deleteBusinessLocation(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in business locations API:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage, details: String(error) });
  }
}

async function getBusinessLocations(req: Request, res: Response) {
  try {
    console.log('[getBusinessLocations] Starting fetch...');
    const { business_id } = req.query;
    console.log('[getBusinessLocations] business_id filter:', business_id);

    let query = supabase
      .from('business_locations')
      .select('*')
      .order('created_at', { ascending: false });

    if (business_id) {
      query = query.eq('business_id', business_id);
    }

    console.log('[getBusinessLocations] Executing Supabase query...');
    const { data, error } = await query;

    if (error) {
      console.error('[getBusinessLocations] Supabase error:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    console.log(`[getBusinessLocations] Successfully fetched ${data?.length || 0} locations`);
    return res.status(200).json({ 
      success: true,
      data: data || []
    });

  } catch (error) {
    console.error('[getBusinessLocations] Unexpected error:', error);
    console.error('[getBusinessLocations] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ error: 'Failed to fetch business locations', details: String(error) });
  }
}

async function createBusinessLocation(req: Request, res: Response) {
  try {
    const locationData = req.body;

    const { data, error } = await supabase
      .from('business_locations')
      .insert([locationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating business location:', error);
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
    console.error('Error in createBusinessLocation:', error);
    return res.status(500).json({ error: 'Failed to create business location' });
  }
}

async function updateBusinessLocation(req: Request, res: Response) {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const { data, error } = await supabase
      .from('business_locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating business location:', error);
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
    console.error('Error in updateBusinessLocation:', error);
    return res.status(500).json({ error: 'Failed to update business location' });
  }
}

async function deleteBusinessLocation(req: Request, res: Response) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Location ID is required' });
    }

    const { error } = await supabase
      .from('business_locations')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting business location:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Location deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteBusinessLocation:', error);
    return res.status(500).json({ error: 'Failed to delete business location' });
  }
}

