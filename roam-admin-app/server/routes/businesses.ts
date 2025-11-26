import { Request, Response } from 'express';
import { supabase } from '../lib/supabase.js';

export async function handleBusinesses(req: Request, res: Response) {
  try {
    switch (req.method) {
      case 'GET':
        return await getBusinesses(req, res);
      case 'PUT':
        return await updateBusinessVerification(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Unexpected error in businesses API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return res.status(500).json({ error: errorMessage });
  }
}

async function getBusinesses(req: Request, res: Response) {
  try {
    console.log('[Businesses API] GET request received');
    console.log('[Businesses API] Query params:', req.query);

    const { 
      verification_status,
      business_type,
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc',
      use_approvals_view = 'false'
    } = req.query;

    // Use optimized approvals view for verification page (reduces load time by 10-20x)
    if (use_approvals_view === 'true') {
      return await getBusinessesForApprovals(req, res);
    }

    console.log('[Businesses API] Building query...');

    let query = supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        contact_email,
        phone,
        verification_status,
        stripe_account_id,
        is_active,
        created_at,
        image_url,
        website_url,
        logo_url,
        cover_image_url,
        business_hours,
        social_media,
        verification_notes,
        business_type,
        setup_completed,
        setup_step,
        is_featured,
        identity_verified,
        identity_verified_at,
        bank_connected,
        bank_connected_at,
        application_submitted_at,
        approved_at,
        approved_by,
        approval_notes,
        business_description
      `, { count: 'exact' });  // Add count option

    if (search) {
      query = query.or(`business_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    if (verification_status && verification_status !== 'all') {
      query = query.eq('verification_status', verification_status);
    }

    if (business_type && business_type !== 'all') {
      query = query.eq('business_type', business_type);
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

    console.log('[Businesses API] Executing query...');
    
    // Execute the query directly without timeout wrapper (Supabase has its own timeout)
    const { data: businesses, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('[Businesses API] Error fetching businesses:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    console.log(`[Businesses API] Query successful. Found ${businesses?.length || 0} businesses (total: ${count})`);

    // Fetch service categories and subcategories for each business
    let businessCategories: any[] = [];
    let businessSubcategories: any[] = [];
    
    if (businesses && businesses.length > 0) {
      console.log('[Businesses API] Fetching service categories and subcategories...');
      const businessIds = businesses.map(b => b.id);
      
      // Fetch business service categories
      const categoriesResult = await supabase
        .from('business_service_categories')
        .select(`
          business_id,
          service_categories (
            service_category_type
          )
        `)
        .in('business_id', businessIds);
      
      businessCategories = categoriesResult.data || [];
      
      // Fetch business service subcategories
      const subcategoriesResult = await supabase
        .from('business_service_subcategories')
        .select(`
          business_id,
          service_subcategories (
            service_subcategory_type
          )
        `)
        .in('business_id', businessIds);
      
      businessSubcategories = subcategoriesResult.data || [];
    }

    // Create lookup maps
    const categoriesMap = new Map<string, string[]>();
    const subcategoriesMap = new Map<string, string[]>();

    (businessCategories || []).forEach((bc: any) => {
      if (!categoriesMap.has(bc.business_id)) {
        categoriesMap.set(bc.business_id, []);
      }
      if (bc.service_categories?.service_category_type) {
        categoriesMap.get(bc.business_id)!.push(bc.service_categories.service_category_type);
      }
    });

    (businessSubcategories || []).forEach((bsc: any) => {
      if (!subcategoriesMap.has(bsc.business_id)) {
        subcategoriesMap.set(bsc.business_id, []);
      }
      if (bsc.service_subcategories?.service_subcategory_type) {
        subcategoriesMap.get(bsc.business_id)!.push(bsc.service_subcategories.service_subcategory_type);
      }
    });

    // Transform the data
    console.log('[Businesses API] Transforming business data...');
    const transformedBusinesses = (businesses || []).map((business: any) => ({
      ...business,
      // Populate service categories and subcategories from junction tables
      service_categories: categoriesMap.get(business.id) || [],
      service_subcategories: subcategoriesMap.get(business.id) || [],
      // Ensure numeric fields are properly typed
      setup_step: business.setup_step ? Number(business.setup_step) : null,
      // Ensure boolean fields have defaults
      setup_completed: business.setup_completed ?? null,
      is_featured: business.is_featured ?? false,
      identity_verified: business.identity_verified ?? false,
      bank_connected: business.bank_connected ?? false,
      is_active: business.is_active ?? true,
      // Add empty metrics for now (can be populated later if needed)
      metrics: {
        provider_count: 0,
        total_bookings: 0
      },
      verification_summary: {
        status: business.verification_status,
        identity_verified: business.identity_verified,
        bank_connected: business.bank_connected,
        setup_completed: business.setup_completed,
        pending_items: getPendingVerificationItems(business)
      }
    }));

    console.log('[Businesses API] Transformation complete. Sending response...');
    
    const response = { 
      data: transformedBusinesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    };

    console.log('[Businesses API] Response ready:', {
      businessCount: response.data.length,
      pagination: response.pagination
    });

    return res.status(200).json(response);

  } catch (error) {
    console.error('[Businesses API] Error in getBusinesses:', error);
    console.error('[Businesses API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return res.status(500).json({ 
      error: 'Failed to fetch businesses',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function updateBusinessVerification(req: Request, res: Response) {
  try {
    const businessId = req.query.id || req.body.business_id;
    const { 
      verification_status, 
      verification_notes,
      admin_id 
    } = req.body;

    if (!businessId) {
      return res.status(400).json({ error: 'Business ID is required' });
    }

    if (!['pending', 'approved', 'rejected', 'suspended'].includes(verification_status)) {
      return res.status(400).json({ 
        error: 'Invalid verification status. Must be: pending, approved, rejected, or suspended' 
      });
    }

    // Update business verification status
    const { data: business, error: updateError } = await supabase
      .from('business_profiles')
      .update({
        verification_status,
        verification_notes,
        approved_at: verification_status === 'approved' ? new Date().toISOString() : null,
        approved_by: verification_status === 'approved' ? admin_id : null,
        approval_notes: verification_notes
      })
      .eq('id', businessId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating business verification:', updateError);
      return res.status(500).json({ 
        error: updateError.message,
        details: updateError.details 
      });
    }

    // If approved, also approve all associated providers
    if (verification_status === 'approved') {
      const { error: providerUpdateError } = await supabase
        .from('providers')
        .update({ 
          verification_status: 'approved'
        })
        .eq('business_id', businessId);

      if (providerUpdateError) {
        console.error('Error updating provider verification:', providerUpdateError);
      }
    }

    return res.status(200).json({ 
      message: `Business verification ${verification_status} successfully`,
      business: {
        id: business.id,
        business_name: business.business_name,
        verification_status: business.verification_status,
        approved_at: business.approved_at
      }
    });

  } catch (error) {
    console.error('Error in updateBusinessVerification:', error);
    return res.status(500).json({ error: 'Failed to update business verification' });
  }
}

// Get verification statistics for dashboard
export async function handleVerificationStats(req: Request, res: Response) {
  try {
    const { days = '30' } = req.query;
    
    const daysBack = parseInt(days as string);
    const startDate = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    const businessStats = await getBusinessVerificationStats();
    const recentActivity = await getRecentVerificationActivity(startDate);

    return res.status(200).json({
      data: {
        businesses: businessStats,
        recent_activity: recentActivity,
        period_days: daysBack
      }
    });

  } catch (error) {
    console.error('Error in handleVerificationStats:', error);
    return res.status(500).json({ error: 'Failed to fetch verification statistics' });
  }
}

// Helper functions
function getPendingVerificationItems(business: any): string[] {
  const pending = [];
  
  if (!business.identity_verified) {
    pending.push('Identity verification required');
  }
  
  if (!business.bank_connected) {
    pending.push('Bank account connection required');
  }

  if (!business.setup_completed) {
    pending.push('Business setup incomplete');
  }

  if (!business.business_description || business.business_description.length < 50) {
    pending.push('Business description needs to be more detailed');
  }

  if (!business.service_categories || business.service_categories.length === 0) {
    pending.push('Service categories must be selected');
  }

  return pending;
}

async function getBusinessVerificationStats() {
  try {
    const { count: total } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true });

    const { count: approved } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'approved');

    const { count: pending } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending');

    const { count: rejected } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'rejected');

    const { count: suspended } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'suspended');

    return {
      total: total || 0,
      approved: approved || 0,
      pending: pending || 0,
      rejected: rejected || 0,
      suspended: suspended || 0,
      approval_rate: total ? Math.round((approved || 0) / total * 100) : 0
    };
  } catch (error) {
    console.error('Error getting business verification stats:', error);
    return { total: 0, approved: 0, pending: 0, rejected: 0, suspended: 0, approval_rate: 0 };
  }
}

async function getRecentVerificationActivity(startDate: string) {
  try {
    const { data: activity } = await supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        verification_status,
        approved_at,
        approved_by
      `)
      .gte('approved_at', startDate)
      .order('approved_at', { ascending: false })
      .limit(10);

    return activity || [];
  } catch (error) {
    console.error('Error getting recent verification activity:', error);
    return [];
  }
}

// Optimized function for business approvals page
async function getBusinessesForApprovals(req: Request, res: Response) {
  try {
    console.log('[Businesses API] Using optimized approvals view');
    
    const { 
      verification_status,
      search,
      sortBy = 'days_pending',
      sortOrder = 'desc'
    } = req.query;

    // Use the optimized view with pre-aggregated document counts
    let query = supabase
      .from('admin_business_approvals_view')
      .select('*');

    // Filter by verification status - default to pending/suspended for approvals page
    if (verification_status && verification_status !== 'all') {
      query = query.eq('verification_status', verification_status);
    } else {
      // Default: only show businesses that need approval (pending or suspended)
      query = query.in('verification_status', ['pending', 'suspended']);
    }

    // Search functionality
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,contact_email.ilike.%${search}%`);
    }

    // Sorting - prioritize businesses needing attention
    const sortField = sortBy as string;
    const order = sortOrder === 'desc' ? { ascending: false } : { ascending: true };
    
    // Default sort: businesses requiring attention first, then by days pending
    if (sortBy === 'days_pending') {
      query = query
        .order('requires_attention', { ascending: false })
        .order('days_pending', { ascending: false });
    } else {
      query = query.order(sortField, order);
    }

    const { data: businesses, error } = await query;

    if (error) {
      console.error('Error fetching businesses for approvals:', error);
      return res.status(500).json({ 
        error: error.message,
        details: error.details 
      });
    }

    console.log(`[Businesses API] Returned ${businesses?.length || 0} businesses for approval`);

    return res.status(200).json({ 
      data: businesses || [],
      count: businesses?.length || 0
    });

  } catch (error) {
    console.error('Error in getBusinessesForApprovals:', error);
    return res.status(500).json({ error: 'Failed to fetch businesses for approvals' });
  }
}
