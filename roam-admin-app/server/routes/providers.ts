import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleProviders(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getProviders(req, res);
      case 'POST':
        return await createProvider(req, res);
      case 'PUT':
        return await updateProvider(req, res);
      case 'DELETE':
        return await deleteProvider(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in providers API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getProviders(req: Request, res: Response) {
  try {
    const { verification_status, background_check_status, business_id, is_active, provider_role } = req.query;

    let query = supabase
      .from('providers')
      .select(`
        *,
        business_profiles!business_id (
          business_name
        ),
        provider_services (
          id,
          provider_id,
          service_id,
          is_active,
          created_at,
          services (
            id,
            name,
            description,
            min_price,
            duration_minutes,
            is_active,
            service_subcategories (
              service_subcategory_type,
              service_categories (
                service_category_type
              )
            )
          )
        ),
        provider_addons (
          id,
          provider_id,
          addon_id,
          is_active,
          created_at,
          service_addons (
            id,
            name,
            description,
            image_url,
            is_active
          )
        )
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (verification_status && verification_status !== 'all') {
      query = query.eq('verification_status', verification_status);
    }

    if (background_check_status && background_check_status !== 'all') {
      query = query.eq('background_check_status', background_check_status);
    }

    if (business_id) {
      query = query.eq('business_id', business_id);
    }

    if (is_active !== undefined && is_active !== 'all') {
      query = query.eq('is_active', is_active === 'true');
    }

    if (provider_role && provider_role !== 'all') {
      query = query.eq('provider_role', provider_role);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching providers:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    // Fetch auth emails and last sign in for each provider using admin API
    const userIds = (data || []).map(p => p.user_id).filter(Boolean);
    let authDataMap: Record<string, { email: string | null; last_sign_in_at: string | null }> = {};
    
    if (userIds.length > 0) {
      for (const userId of userIds) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(userId);
          if (authUser?.user) {
            authDataMap[userId] = {
              email: authUser.user.email || null,
              last_sign_in_at: authUser.user.last_sign_in_at || null,
            };
          }
        } catch (err) {
          // Skip if we can't fetch auth user
          console.warn(`Could not fetch auth user for provider ${userId}`);
        }
      }
    }

    // Merge auth data into provider data
    const enhancedProviders = (data || []).map(provider => ({
      ...provider,
      auth_email: authDataMap[provider.user_id]?.email || null,
      last_sign_in_at: authDataMap[provider.user_id]?.last_sign_in_at || null,
    }));

    return res.status(200).json({ 
      success: true,
      data: enhancedProviders
    });

  } catch (error) {
    console.error('Error in getProviders:', error);
    return res.status(500).json({ error: 'Failed to fetch providers' });
  }
}

async function createProvider(req: Request, res: Response) {
  try {
    const providerData = req.body;

    // Set defaults for new providers
    const newProviderData = {
      ...providerData,
      verification_status: providerData.verification_status || 'pending',
      background_check_status: providerData.background_check_status || 'pending',
      total_bookings: 0,
      completed_bookings: 0,
      average_rating: 0,
      total_reviews: 0,
    };

    const { data, error } = await supabase
      .from('providers')
      .insert([newProviderData])
      .select(`
        *,
        business_profiles!business_id (
          business_name
        )
      `)
      .single();

    if (error) {
      console.error('Error creating provider:', error);
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
    console.error('Error in createProvider:', error);
    return res.status(500).json({ error: 'Failed to create provider' });
  }
}

async function updateProvider(req: Request, res: Response) {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }

    const { data, error } = await supabase
      .from('providers')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        business_profiles!business_id (
          business_name
        )
      `)
      .single();

    if (error) {
      console.error('Error updating provider:', error);
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
    console.error('Error in updateProvider:', error);
    return res.status(500).json({ error: 'Failed to update provider' });
  }
}

async function deleteProvider(req: Request, res: Response) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Provider ID is required' });
    }

    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting provider:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Provider deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteProvider:', error);
    return res.status(500).json({ error: 'Failed to delete provider' });
  }
}

export async function handleProviderServices(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getProviderServices(req, res);
      case 'POST':
        return await createProviderService(req, res);
      case 'PUT':
        return await updateProviderService(req, res);
      case 'DELETE':
        return await deleteProviderService(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in provider services API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getProviderServices(req: Request, res: Response) {
  try {
    const { provider_id } = req.query;

    let query = supabase
      .from('provider_services')
      .select(`
        *,
        services (
          id,
          name,
          description,
          min_price,
          duration_minutes,
          is_active,
          service_subcategories (
            service_subcategory_type,
            service_categories (
              service_category_type
            )
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching provider services:', error);
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
    console.error('Error in getProviderServices:', error);
    return res.status(500).json({ error: 'Failed to fetch provider services' });
  }
}

async function createProviderService(req: Request, res: Response) {
  try {
    const serviceData = req.body;

    const { data, error } = await supabase
      .from('provider_services')
      .insert([serviceData])
      .select(`
        *,
        services (
          id,
          name,
          description,
          min_price,
          duration_minutes,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Error creating provider service:', error);
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
    console.error('Error in createProviderService:', error);
    return res.status(500).json({ error: 'Failed to create provider service' });
  }
}

async function updateProviderService(req: Request, res: Response) {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Provider service ID is required' });
    }

    const { data, error } = await supabase
      .from('provider_services')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        services (
          id,
          name,
          description,
          min_price,
          duration_minutes,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Error updating provider service:', error);
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
    console.error('Error in updateProviderService:', error);
    return res.status(500).json({ error: 'Failed to update provider service' });
  }
}

async function deleteProviderService(req: Request, res: Response) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Provider service ID is required' });
    }

    const { error } = await supabase
      .from('provider_services')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting provider service:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Provider service deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteProviderService:', error);
    return res.status(500).json({ error: 'Failed to delete provider service' });
  }
}

export async function handleProviderAddons(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getProviderAddons(req, res);
      case 'POST':
        return await createProviderAddon(req, res);
      case 'PUT':
        return await updateProviderAddon(req, res);
      case 'DELETE':
        return await deleteProviderAddon(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in provider addons API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getProviderAddons(req: Request, res: Response) {
  try {
    const { provider_id } = req.query;

    let query = supabase
      .from('provider_addons')
      .select(`
        *,
        service_addons (
          id,
          name,
          description,
          image_url,
          is_active
        )
      `)
      .order('created_at', { ascending: false });

    if (provider_id) {
      query = query.eq('provider_id', provider_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching provider addons:', error);
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
    console.error('Error in getProviderAddons:', error);
    return res.status(500).json({ error: 'Failed to fetch provider addons' });
  }
}

async function createProviderAddon(req: Request, res: Response) {
  try {
    const addonData = req.body;

    const { data, error } = await supabase
      .from('provider_addons')
      .insert([addonData])
      .select(`
        *,
        service_addons (
          id,
          name,
          description,
          image_url,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Error creating provider addon:', error);
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
    console.error('Error in createProviderAddon:', error);
    return res.status(500).json({ error: 'Failed to create provider addon' });
  }
}

async function updateProviderAddon(req: Request, res: Response) {
  try {
    const { id, ...updateData } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Provider addon ID is required' });
    }

    const { data, error } = await supabase
      .from('provider_addons')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        service_addons (
          id,
          name,
          description,
          image_url,
          is_active
        )
      `)
      .single();

    if (error) {
      console.error('Error updating provider addon:', error);
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
    console.error('Error in updateProviderAddon:', error);
    return res.status(500).json({ error: 'Failed to update provider addon' });
  }
}

async function deleteProviderAddon(req: Request, res: Response) {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'Provider addon ID is required' });
    }

    const { error } = await supabase
      .from('provider_addons')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting provider addon:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Provider addon deleted successfully'
    });

  } catch (error) {
    console.error('Error in deleteProviderAddon:', error);
    return res.status(500).json({ error: 'Failed to delete provider addon' });
  }
}

