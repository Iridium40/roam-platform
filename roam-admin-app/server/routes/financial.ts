import { Request, Response } from "express";
import { supabase } from "../lib/supabase";

export async function handleFinancialStats(req: Request, res: Response) {
  try {
    const { dateRange = "30" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    // Fetch financial statistics
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('total_amount, created_at, booking_status')
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (bookingsError) throw bookingsError;
    
    // Calculate metrics
    const totalRevenue = bookings?.reduce((sum, booking) => 
      sum + (booking.total_amount || 0), 0) || 0;
    
    const completedBookings = bookings?.filter(b => b.booking_status === 'completed').length || 0;
    const totalBookings = bookings?.length || 0;
    
    // Fetch previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange as string));
    
    const { data: prevBookings, error: prevBookingsError } = await supabase
      .from('bookings')
      .select('total_amount, created_at, booking_status')
      .gte('created_at', prevStartDate.toISOString())
      .lt('created_at', startDate.toISOString());
    
    if (prevBookingsError) throw prevBookingsError;
    
    const prevRevenue = prevBookings?.reduce((sum, booking) => 
      sum + (booking.total_amount || 0), 0) || 0;
    
    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    
    // Fetch pending payouts
    const { data: payouts, error: payoutsError } = await supabase
      .from('payout_requests')
      .select('amount, status')
      .eq('status', 'pending');
    
    if (payoutsError) throw payoutsError;
    
    const pendingPayouts = payouts?.reduce((sum, payout) => sum + (payout.amount || 0), 0) || 0;
    
    // Fetch active subscriptions
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('business_profiles')
      .select('subscription_status')
      .eq('subscription_status', 'active');
    
    if (subscriptionsError) throw subscriptionsError;
    
    const activeSubscriptions = subscriptions?.length || 0;
    
    const stats = {
      totalRevenue: {
        amount: totalRevenue,
        change: revenueChange,
        period: `Last ${dateRange} days`
      },
      pendingPayouts: {
        amount: pendingPayouts,
        count: payouts?.length || 0,
        change: 0 // TODO: Calculate change
      },
      platformFees: {
        amount: totalRevenue * 0.07, // 7% platform fee
        change: revenueChange,
        period: `Last ${dateRange} days`
      },
      activeSubscriptions: {
        count: activeSubscriptions,
        revenue: 0, // TODO: Calculate subscription revenue
        change: 0 // TODO: Calculate change
      }
    };
    
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error fetching financial stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch financial statistics' 
    });
  }
}

export async function handleTransactions(req: Request, res: Response) {
  try {
    const { dateRange = "30", status = "all", search = "" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    let query = supabase
      .from('bookings')
      .select(`
        id,
        total_amount,
        created_at,
        booking_status,
        business_profiles!inner(business_name),
        customer_profiles!inner(first_name, last_name)
      `)
      .gte('created_at', startDate.toISOString())
      .lte('created_at', endDate.toISOString());
    
    if (status !== 'all') {
      query = query.eq('booking_status', status);
    }
    
    if (search) {
      query = query.or(`business_profiles.business_name.ilike.%${search}%,customer_profiles.first_name.ilike.%${search}%,customer_profiles.last_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const transactions = data?.map(booking => ({
      id: booking.id,
      type: 'payment' as const,
      amount: booking.total_amount || 0,
      status: booking.booking_status,
      description: `Booking #${booking.id}`,
      business_name: booking.business_profiles?.business_name || 'Unknown',
      customer_name: `${booking.customer_profiles?.first_name || ''} ${booking.customer_profiles?.last_name || ''}`.trim(),
      created_at: booking.created_at,
      fee_amount: (booking.total_amount || 0) * 0.07,
      net_amount: (booking.total_amount || 0) * 0.93,
    })) || [];
    
    res.json({ success: true, data: transactions });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch transactions' 
    });
  }
}

export async function handlePayoutRequests(req: Request, res: Response) {
  try {
    const { status = "all" } = req.query;
    
    let query = supabase
      .from('payout_requests')
      .select(`
        id,
        amount,
        status,
        requested_at,
        processed_at,
        notes,
        business_profiles!inner(business_name)
      `)
      .order('requested_at', { ascending: false });
    
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const payouts = data?.map(payout => ({
      id: payout.id,
      business_id: payout.business_profiles?.id || '',
      business_name: payout.business_profiles?.business_name || 'Unknown',
      amount: payout.amount || 0,
      status: payout.status,
      requested_at: payout.requested_at,
      processed_at: payout.processed_at,
      notes: payout.notes,
    })) || [];
    
    res.json({ success: true, data: payouts });
  } catch (error) {
    console.error('Error fetching payout requests:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch payout requests' 
    });
  }
}

export async function handleUpdatePayoutStatus(req: Request, res: Response) {
  try {
    const { payoutId, action } = req.body;
    
    if (!payoutId || !action) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: payoutId and action'
      });
    }
    
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    const { error } = await supabase
      .from('payout_requests')
      .update({ 
        status: newStatus,
        processed_at: new Date().toISOString()
      })
      .eq('id', payoutId);
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: `Payout ${action === 'approve' ? 'approved' : 'rejected'} successfully` 
    });
  } catch (error) {
    console.error('Error updating payout status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update payout status' 
    });
  }
}

export async function handleRevenueData(req: Request, res: Response) {
  try {
    const { days = "30" } = req.query;
    const numDays = parseInt(days as string);
    
    const revenueData = [];
    const endDate = new Date();
    
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      
      // Fetch bookings for this day
      const { data: dayBookings, error: dayBookingsError } = await supabase
        .from('bookings')
        .select('total_amount, created_at')
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString());
      
      if (dayBookingsError) throw dayBookingsError;
      
      const dayRevenue = dayBookings?.reduce((sum, booking) => 
        sum + (booking.total_amount || 0), 0) || 0;
      
      const dayBookingsCount = dayBookings?.length || 0;
      const dayFees = dayRevenue * 0.07;
      
      revenueData.push({
        date: date.toISOString().split('T')[0],
        revenue: dayRevenue,
        bookings: dayBookingsCount,
        fees: dayFees,
      });
    }
    
    res.json({ success: true, data: revenueData });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch revenue data' 
    });
  }
}
