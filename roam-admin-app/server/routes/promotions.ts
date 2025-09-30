import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export async function handlePromotions(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getPromotions(req, res);
      case 'POST':
        return await createPromotion(req, res);
      case 'PUT':
        return await updatePromotion(req, res);
      case 'DELETE':
        return await deletePromotion(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in promotions API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getPromotions(req: Request, res: Response) {
  try {
    const { 
      status,
      business_id,
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('promotions')
      .select(`
        id,
        title,
        description,
        start_date,
        end_date,
        is_active,
        created_at,
        business_id,
        image_url,
        promo_code,
        service_id,
        savings_type,
        savings_amount,
        savings_max_amount,
        business_profiles (
          id,
          business_name
        ),
        services (
          id,
          name
        )
      `);

    // Apply filters
    if (status === 'active') {
      query = query.eq('is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('is_active', false);
    }

    if (business_id) {
      query = query.eq('business_id', business_id);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,promo_code.ilike.%${search}%`);
    }

    // Apply sorting
    const sortField = sortBy as string;
    const order = sortOrder === 'desc' ? { ascending: false } : { ascending: true };
    query = query.order(sortField, order);

    // Apply pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    
    query = query.range(offset, offset + limitNum - 1);

    const { data: promotions, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching promotions:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    // Get usage statistics for each promotion
    const promotionsWithStats = await Promise.all(
      (promotions || []).map(async (promotion: any) => {
        const { data: usageData, error: usageError } = await supabase
          .from('promotion_usage')
          .select('id, discount_applied, created_at')
          .eq('promotion_id', promotion.id);

        if (usageError) {
          console.error('Error fetching usage for promotion:', promotion.id, usageError);
        }

        const usage = usageData || [];
        const totalUsage = usage.length;
        const totalSavings = usage.reduce((sum: number, u: any) => sum + (u.discount_applied || 0), 0);

        // Check if promotion is currently valid
        const now = new Date();
        const startDate = promotion.start_date ? new Date(promotion.start_date) : null;
        const endDate = promotion.end_date ? new Date(promotion.end_date) : null;
        
        const isCurrentlyValid = promotion.is_active && 
          (!startDate || startDate <= now) && 
          (!endDate || endDate >= now);

        return {
          ...promotion,
          business_name: promotion.business_profiles?.business_name || null,
          service_name: promotion.services?.name || null,
          usage_count: totalUsage,
          total_savings: totalSavings,
          is_currently_valid: isCurrentlyValid,
          status: isCurrentlyValid ? 'active' : 
                  (promotion.is_active ? 'scheduled' : 'inactive')
        };
      })
    );

    return res.status(200).json({ 
      data: promotionsWithStats,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in getPromotions:', error);
    return res.status(500).json({ error: 'Failed to fetch promotions' });
  }
}

async function createPromotion(req: Request, res: Response) {
  try {
    const {
      title,
      description,
      start_date,
      end_date,
      is_active = true,
      business_id,
      image_url,
      promo_code,
      service_id,
      savings_type,
      savings_amount,
      savings_max_amount
    } = req.body;

    // Validate required fields
    if (!title || !promo_code) {
      return res.status(400).json({ 
        error: 'title and promo_code are required' 
      });
    }

    // Validate savings_type and related fields
    if (savings_type && !['percentage_off', 'fixed_amount'].includes(savings_type)) {
      return res.status(400).json({ 
        error: 'savings_type must be either "percentage_off" or "fixed_amount"' 
      });
    }

    if (savings_type && savings_amount !== undefined) {
      if (savings_type === 'percentage_off' && (savings_amount < 0 || savings_amount > 100)) {
        return res.status(400).json({ 
          error: 'Percentage discount must be between 0 and 100' 
        });
      }
      if (savings_type === 'fixed_amount' && savings_amount < 0) {
        return res.status(400).json({ 
          error: 'Fixed amount discount must be positive' 
        });
      }
    }

    // Check if promo code already exists
    const { data: existingPromo, error: checkError } = await supabase
      .from('promotions')
      .select('id, promo_code')
      .eq('promo_code', promo_code)
      .single();

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing promo code:', checkError);
      return res.status(500).json({ 
        error: 'Failed to validate promo code uniqueness' 
      });
    }

    if (existingPromo) {
      return res.status(400).json({ 
        error: `Promo code "${promo_code}" already exists` 
      });
    }

    const { data: promotion, error: insertError } = await supabase
      .from('promotions')
      .insert([{
        title,
        description,
        start_date,
        end_date,
        is_active,
        business_id,
        image_url,
        promo_code,
        service_id,
        savings_type,
        savings_amount,
        savings_max_amount
      }])
      .select(`
        *,
        business_profiles (
          id,
          business_name
        ),
        services (
          id,
          name
        )
      `)
      .single();

    if (insertError) {
      console.error('Error creating promotion:', insertError);
      return res.status(500).json({ 
        error: insertError.message,
        details: insertError.details 
      });
    }

    return res.status(201).json({ data: promotion });

  } catch (error) {
    console.error('Error in createPromotion:', error);
    return res.status(500).json({ error: 'Failed to create promotion' });
  }
}

async function updatePromotion(req: Request, res: Response) {
  try {
    const promotionId = req.params?.id || req.body?.id;
    if (!promotionId) {
      return res.status(400).json({ error: 'Promotion ID is required' });
    }

    const {
      title,
      description,
      start_date,
      end_date,
      is_active,
      business_id,
      image_url,
      promo_code,
      service_id,
      savings_type,
      savings_amount,
      savings_max_amount
    } = req.body;

    // Build update object with only provided fields
    const updateData: any = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = start_date;
    if (end_date !== undefined) updateData.end_date = end_date;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (business_id !== undefined) updateData.business_id = business_id;
    if (image_url !== undefined) updateData.image_url = image_url;
    if (promo_code !== undefined) updateData.promo_code = promo_code;
    if (service_id !== undefined) updateData.service_id = service_id;
    if (savings_type !== undefined) updateData.savings_type = savings_type;
    if (savings_amount !== undefined) updateData.savings_amount = savings_amount;
    if (savings_max_amount !== undefined) updateData.savings_max_amount = savings_max_amount;

    // Validate savings_type if being updated
    if (savings_type && !['percentage_off', 'fixed_amount'].includes(savings_type)) {
      return res.status(400).json({ 
        error: 'savings_type must be either "percentage_off" or "fixed_amount"' 
      });
    }

    // Check promo code uniqueness if being updated
    if (promo_code) {
      const { data: existingPromo, error: checkError } = await supabase
        .from('promotions')
        .select('id, promo_code')
        .eq('promo_code', promo_code)
        .neq('id', promotionId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing promo code:', checkError);
        return res.status(500).json({ 
          error: 'Failed to validate promo code uniqueness' 
        });
      }

      if (existingPromo) {
        return res.status(400).json({ 
          error: `Promo code "${promo_code}" already exists` 
        });
      }
    }

    const { data: promotion, error: updateError } = await supabase
      .from('promotions')
      .update(updateData)
      .eq('id', promotionId)
      .select(`
        *,
        business_profiles (
          id,
          business_name
        ),
        services (
          id,
          name
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating promotion:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details 
      });
    }

    return res.status(200).json({ data: promotion });

  } catch (error) {
    console.error('Error in updatePromotion:', error);
    return res.status(500).json({ error: 'Failed to update promotion' });
  }
}

async function deletePromotion(req: Request, res: Response) {
  try {
    const promotionId = req.params?.id || req.body?.id;
    if (!promotionId) {
      return res.status(400).json({ error: 'Promotion ID is required' });
    }

    // Check if promotion has been used
    const { data: usage, error: usageError } = await supabase
      .from('promotion_usage')
      .select('id')
      .eq('promotion_id', promotionId)
      .limit(1);

    if (usageError) {
      console.error('Error checking promotion usage:', usageError);
      return res.status(500).json({ 
        error: 'Failed to check promotion usage' 
      });
    }

    if (usage && usage.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete promotion that has been used. Consider deactivating it instead.' 
      });
    }

    const { error: deleteError } = await supabase
      .from('promotions')
      .delete()
      .eq('id', promotionId);

    if (deleteError) {
      console.error('Error deleting promotion:', deleteError);
      return res.status(500).json({ 
        error: deleteError.message,
        details: deleteError.details 
      });
    }

    return res.status(200).json({ 
      message: 'Promotion deleted successfully',
      id: promotionId 
    });

  } catch (error) {
    console.error('Error in deletePromotion:', error);
    return res.status(500).json({ error: 'Failed to delete promotion' });
  }
}

// Get promotion usage statistics
export async function handlePromotionUsage(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { 
      page = '1',
      limit = '50'
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    const { data: usage, error: fetchError, count } = await supabase
      .from('promotion_usage')
      .select(`
        id,
        discount_applied,
        original_amount,
        final_amount,
        created_at,
        used_at,
        bookings!inner (
          id,
          booking_reference,
          customer_profiles!inner (
            id,
            first_name,
            last_name
          ),
          services!inner (
            id,
            name
          )
        )
      `)
      .eq('promotion_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (fetchError) {
      console.error('Error fetching promotion usage:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    const transformedUsage = usage?.map((u: any) => ({
      ...u,
      customer_name: `${u.bookings?.customer_profiles?.first_name || ''} ${u.bookings?.customer_profiles?.last_name || ''}`.trim(),
      service_name: u.bookings?.services?.name || 'Unknown Service',
      booking_reference: u.bookings?.booking_reference || u.bookings?.id
    })) || [];

    return res.status(200).json({ 
      data: transformedUsage,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in handlePromotionUsage:', error);
    return res.status(500).json({ error: 'Failed to fetch promotion usage' });
  }
}

// Activate/Deactivate promotion
export async function handlePromotionActivation(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!['activate', 'deactivate'].includes(action)) {
      return res.status(400).json({ 
        error: 'Invalid action. Must be "activate" or "deactivate"' 
      });
    }

    const is_active = action === 'activate';

    const { data: promotion, error: updateError } = await supabase
      .from('promotions')
      .update({ is_active })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating promotion status:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details 
      });
    }

    return res.status(200).json({ 
      data: promotion,
      message: `Promotion ${action}d successfully`
    });

  } catch (error) {
    console.error('Error in handlePromotionActivation:', error);
    return res.status(500).json({ error: 'Failed to update promotion status' });
  }
}