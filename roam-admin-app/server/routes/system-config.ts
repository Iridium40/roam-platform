import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleSystemConfig(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getSystemConfig(req, res);
      case 'POST':
        return await createSystemConfig(req, res);
      case 'PUT':
        return await updateSystemConfig(req, res);
      case 'DELETE':
        return await deleteSystemConfig(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in system config API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getSystemConfig(req: Request, res: Response) {
  try {
    const { keys, includePrivate } = req.query;

    let query = supabase
      .from("system_config")
      .select("*");

    // Only include public configs unless explicitly requested
    if (!includePrivate || includePrivate === 'false') {
      query = query.eq("is_public", true);
    }

    // Filter by specific keys if provided
    if (keys && typeof keys === "string") {
      const keyArray = keys.split(",").map((k) => k.trim());
      query = query.in("config_key", keyArray);
    }

    const { data, error } = await query.order('config_group', { ascending: true });

    if (error) {
      console.error("Error fetching system config:", error);
      return res.status(500).json({ 
        success: false,
        error: "Failed to fetch system configuration" 
      });
    }

    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error("System config API error:", error);
    res.status(500).json({ 
      success: false,
      error: "Internal server error" 
    });
  }
}

async function createSystemConfig(req: Request, res: Response) {
  try {
    const {
      config_key,
      config_value,
      description,
      data_type = 'string',
      is_public = false,
      config_group,
      is_encrypted = false
    } = req.body;

    // Validate required fields
    if (!config_key) {
      return res.status(400).json({ 
        success: false,
        error: 'config_key is required' 
      });
    }

    const { data, error } = await supabase
      .from('system_config')
      .insert([{
        config_key,
        config_value,
        description,
        data_type,
        is_public,
        config_group,
        is_encrypted
      }])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ success: true, data });
  } catch (error) {
    console.error('Error creating system config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create system config' 
    });
  }
}

async function updateSystemConfig(req: Request, res: Response) {
  try {
    const configId = req.params?.id || req.body?.id;
    if (!configId) {
      return res.status(400).json({ 
        success: false,
        error: 'Config ID is required' 
      });
    }

    const {
      config_key,
      config_value,
      description,
      data_type,
      is_public,
      config_group,
      is_encrypted
    } = req.body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (config_key !== undefined) updateData.config_key = config_key;
    if (config_value !== undefined) updateData.config_value = config_value;
    if (description !== undefined) updateData.description = description;
    if (data_type !== undefined) updateData.data_type = data_type;
    if (is_public !== undefined) updateData.is_public = is_public;
    if (config_group !== undefined) updateData.config_group = config_group;
    if (is_encrypted !== undefined) updateData.is_encrypted = is_encrypted;

    const { data, error } = await supabase
      .from('system_config')
      .update(updateData)
      .eq('id', configId)
      .select()
      .single();

    if (error) throw error;

    res.json({ success: true, data });
  } catch (error) {
    console.error('Error updating system config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update system config' 
    });
  }
}

async function deleteSystemConfig(req: Request, res: Response) {
  try {
    const configId = req.params?.id || req.body?.id;
    if (!configId) {
      return res.status(400).json({ 
        success: false,
        error: 'Config ID is required' 
      });
    }

    const { error } = await supabase
      .from('system_config')
      .delete()
      .eq('id', configId);

    if (error) throw error;

    res.json({ 
      success: true, 
      message: 'System config deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting system config:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete system config' 
    });
  }
}
