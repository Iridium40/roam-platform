import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

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
    const { 
      verification_status,
      business_type,
      search,
      page = '1',
      limit = '50',
      sortBy = 'created_at',
      sortOrder = 'desc'
    } = req.query;

    let query = supabase
      .from('business_profiles')
      .select(`
        id,
        business_name,
        contact_email,
        phone,
        verification_status,
        stripe_connect_account_id,
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
        service_categories,
        service_subcategories,
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
      `);

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

    const { data: businesses, error: fetchError, count } = await query;

    if (fetchError) {
      console.error('Error fetching businesses:', fetchError);
      return res.status(500).json({ 
        error: fetchError.message,
        details: fetchError.details 
      });
    }

    // Transform the data and add verification metrics
    const transformedBusinesses = await Promise.all(
      (businesses || []).map(async (business: any) => {
        // Get provider count
        const { count: providerCount } = await supabase
          .from('provider_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('business_id', business.id);

        // Get booking metrics
        const { count: totalBookings } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('provider_id', 
            await supabase
              .from('provider_profiles')
              .select('id')
              .eq('business_id', business.id)
              .then(result => result.data?.map(p => p.id) || [])
          );

        return {
          ...business,
          // Ensure arrays are properly handled
          service_categories: Array.isArray(business.service_categories) ? business.service_categories : [],
          service_subcategories: Array.isArray(business.service_subcategories) ? business.service_subcategories : [],
          // Ensure numeric fields are properly typed
          setup_step: business.setup_step ? Number(business.setup_step) : null,
          // Ensure boolean fields have defaults
          setup_completed: business.setup_completed ?? null,
          is_featured: business.is_featured ?? false,
          identity_verified: business.identity_verified ?? false,
          bank_connected: business.bank_connected ?? false,
          is_active: business.is_active ?? true,
          // Add metrics
          metrics: {
            provider_count: providerCount || 0,
            total_bookings: totalBookings || 0
          },
          verification_summary: {
            status: business.verification_status,
            identity_verified: business.identity_verified,
            bank_connected: business.bank_connected,
            setup_completed: business.setup_completed,
            pending_items: getPendingVerificationItems(business)
          }
        };
      })
    );

    return res.status(200).json({ 
      data: transformedBusinesses,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Error in getBusinesses:', error);
    return res.status(500).json({ error: 'Failed to fetch businesses' });
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

    if (!['pending', 'approved', 'rejected', 'requires_documents'].includes(verification_status)) {
      return res.status(400).json({ 
        error: 'Invalid verification status. Must be: pending, approved, rejected, or requires_documents' 
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

    // If approved, also approve all associated provider profiles
    if (verification_status === 'approved') {
      const { error: providerUpdateError } = await supabase
        .from('provider_profiles')
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

    const { count: requiresDocs } = await supabase
      .from('business_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'requires_documents');

    return {
      total: total || 0,
      approved: approved || 0,
      pending: pending || 0,
      rejected: rejected || 0,
      requires_documents: requiresDocs || 0,
      approval_rate: total ? Math.round((approved || 0) / total * 100) : 0
    };
  } catch (error) {
    console.error('Error getting business verification stats:', error);
    return { total: 0, approved: 0, pending: 0, rejected: 0, requires_documents: 0, approval_rate: 0 };
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
