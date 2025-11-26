import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleCustomers(req: Request, res: Response) {
  try {
    const { status = "all" } = req.query;
    
    let query = supabase
      .from('customer_profiles')
      .select(`
        id,
        user_id,
        first_name,
        last_name,
        email,
        phone,
        is_active,
        created_at,
        date_of_birth,
        image_url,
        bio,
        email_notifications,
        sms_notifications,
        push_notifications,
        marketing_emails,
        email_verified,
        phone_verified
      `)
      .order('created_at', { ascending: false });
    
    if (status !== 'all') {
      query = query.eq('is_active', status === 'active');
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching customers:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch customers' 
    });
  }
}

export async function handleCustomerLocations(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('customer_locations')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json({ success: true, data: data || [] });
  } catch (error) {
    console.error('Error fetching customer locations:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch customer locations' 
    });
  }
}

export async function handleCustomerBookings(req: Request, res: Response) {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        id,
        customer_id,
        provider_id,
        service_id,
        booking_date,
        start_time,
        total_amount,
        created_at,
        booking_status,
        payment_status,
        delivery_type,
        guest_name,
        cancelled_at,
        booking_reference,
        providers (
          id,
          first_name,
          last_name,
          business_id
        ),
        services (
          id,
          name,
          duration_minutes,
          min_price
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Fetch business names for each booking's provider
    const businessIds = [...new Set(
      (data || [])
        .map(b => b.providers?.business_id)
        .filter(Boolean)
    )];
    
    let businessMap: Record<string, string> = {};
    if (businessIds.length > 0) {
      const { data: businesses } = await supabase
        .from('business_profiles')
        .select('id, business_name')
        .in('id', businessIds);
      
      if (businesses) {
        businessMap = Object.fromEntries(
          businesses.map(b => [b.id, b.business_name])
        );
      }
    }
    
    // Enhance data with business names
    const enhancedData = (data || []).map(booking => ({
      ...booking,
      providers: booking.providers ? {
        ...booking.providers,
        business_profiles: booking.providers.business_id ? {
          id: booking.providers.business_id,
          business_name: businessMap[booking.providers.business_id] || 'Unknown'
        } : null
      } : null
    }));
    
    res.json({ success: true, data: enhancedData });
  } catch (error) {
    console.error('Error fetching customer bookings:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch customer bookings' 
    });
  }
}

export async function handleUpdateCustomerStatus(req: Request, res: Response) {
  try {
    const { customerId, isActive } = req.body;
    
    if (!customerId || typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: customerId and isActive'
      });
    }
    
    const { error } = await supabase
      .from('customer_profiles')
      .update({ is_active: isActive })
      .eq('id', customerId);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: `Customer ${isActive ? 'activated' : 'deactivated'} successfully` 
    });
  } catch (error) {
    console.error('Error updating customer status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update customer status' 
    });
  }
}

