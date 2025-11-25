import { Request, Response } from "express";
import { supabase } from "../lib/supabase.js";

export async function handleFinancialStats(req: Request, res: Response) {
  try {
    const { dateRange = "30" } = req.query;
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(dateRange as string));
    
    // Fetch financial summary for the date range
    const { data: summary, error: summaryError } = await supabase
      .from('admin_financial_summary')
      .select('*')
      .gte('summary_date', startDate.toISOString().split('T')[0])
      .lte('summary_date', endDate.toISOString().split('T')[0]);
    
    if (summaryError) throw summaryError;
    
    // Aggregate totals from summary
    const totalRevenue = summary?.reduce((sum, s) => sum + (s.total_revenue || 0), 0) || 0;
    const totalPlatformFees = summary?.reduce((sum, s) => sum + (s.total_platform_fees || 0), 0) || 0;
    const totalNetAmount = summary?.reduce((sum, s) => sum + (s.total_net_amount || 0), 0) || 0;
    
    // Fetch previous period for comparison
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - parseInt(dateRange as string));
    
    const { data: prevSummary, error: prevSummaryError } = await supabase
      .from('admin_financial_summary')
      .select('*')
      .gte('summary_date', prevStartDate.toISOString().split('T')[0])
      .lt('summary_date', startDate.toISOString().split('T')[0]);
    
    if (prevSummaryError) throw prevSummaryError;
    
    const prevRevenue = prevSummary?.reduce((sum, s) => sum + (s.total_revenue || 0), 0) || 0;
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
        amount: totalPlatformFees,
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
      .from('admin_financial_overview')
      .select('*')
      .gte('transaction_date', startDate.toISOString())
      .lte('transaction_date', endDate.toISOString());
    
    if (status !== 'all') {
      query = query.eq('transaction_status', status);
    }
    
    if (search) {
      query = query.or(`business_name.ilike.%${search}%,customer_name.ilike.%${search}%,customer_first_name.ilike.%${search}%,customer_last_name.ilike.%${search}%`);
    }
    
    const { data, error } = await query.order('transaction_date', { ascending: false });
    
    if (error) throw error;
    
    // Transform data to match frontend interface
    const transactions = data?.map(transaction => ({
      id: transaction.transaction_id,
      type: transaction.transaction_type === 'booking_payment' ? 'payment' as const : transaction.transaction_type as const,
      amount: transaction.transaction_amount || 0,
      status: transaction.transaction_status,
      description: transaction.description || `Booking #${transaction.booking_id || 'N/A'}`,
      business_name: transaction.business_name || 'Unknown',
      customer_name: transaction.customer_name || 'Unknown',
      created_at: transaction.transaction_date,
      fee_amount: transaction.platform_fee_amount || 0,
      net_amount: transaction.net_amount || 0,
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
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - numDays);
    
    // Fetch daily summary from financial summary view
    const { data: summary, error: summaryError } = await supabase
      .from('admin_financial_summary')
      .select('*')
      .gte('summary_date', startDate.toISOString().split('T')[0])
      .lte('summary_date', endDate.toISOString().split('T')[0])
      .order('summary_date', { ascending: true });
    
    if (summaryError) throw summaryError;
    
    // Transform data to match frontend interface
    const revenueData = summary?.map(day => ({
      date: day.summary_date,
      revenue: day.total_revenue || 0,
      bookings: day.total_bookings || 0,
      fees: day.total_platform_fees || 0,
    })) || [];
    
    // Fill in missing days with zero values
    const revenueDataMap = new Map(revenueData.map(d => [d.date, d]));
    const filledData = [];
    for (let i = numDays - 1; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (revenueDataMap.has(dateStr)) {
        filledData.push(revenueDataMap.get(dateStr)!);
      } else {
        filledData.push({
          date: dateStr,
          revenue: 0,
          bookings: 0,
          fees: 0,
        });
      }
    }
    
    res.json({ success: true, data: filledData });
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch revenue data' 
    });
  }
}
