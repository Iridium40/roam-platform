import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/business/financial-summary
 * 
 * Fetches aggregated financial data for a business using database views
 * 
 * Query params:
 * - business_id: UUID of the business (required)
 * - period: Number of days to look back (default: 30)
 * - tax_year: Tax year to filter by (optional, defaults to current year)
 * 
 * Returns:
 * - summary: Overall earnings summary
 * - period_summary: Summary for the specified period
 * - monthly_earnings: Monthly breakdown
 * - earnings_by_service: Earnings broken down by service
 * - recent_transactions: Recent payment transactions
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (!process.env.VITE_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { business_id, period = '30', tax_year } = req.query;

    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ error: 'business_id is required' });
    }

    const periodDays = parseInt(period as string, 10);
    const currentYear = tax_year ? parseInt(tax_year as string, 10) : new Date().getFullYear();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    // 1. Get overall earnings summary for current tax year
    const { data: summary, error: summaryError } = await supabase
      .from('business_earnings_summary')
      .select('*')
      .eq('business_id', business_id)
      .eq('tax_year', currentYear)
      .single();

    if (summaryError && summaryError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching earnings summary:', summaryError);
    }

    // 2. Get period summary (last N days)
    const { data: periodData, error: periodError } = await supabase
      .from('business_earnings_by_period')
      .select('*')
      .eq('business_id', business_id)
      .gte('period_date', periodStart.toISOString().split('T')[0])
      .order('period_date', { ascending: false });

    if (periodError) {
      console.error('Error fetching period data:', periodError);
    }

    // Aggregate period data
    const periodSummary = periodData?.reduce((acc, day) => {
      acc.transaction_count += day.transaction_count || 0;
      acc.booking_count += day.booking_count || 0;
      acc.gross_earnings += parseFloat(day.gross_earnings || 0);
      acc.platform_fees += parseFloat(day.platform_fees || 0);
      acc.net_earnings += parseFloat(day.net_earnings || 0);
      acc.initial_bookings += day.initial_bookings || 0;
      acc.additional_services += day.additional_services || 0;
      return acc;
    }, {
      transaction_count: 0,
      booking_count: 0,
      gross_earnings: 0,
      platform_fees: 0,
      net_earnings: 0,
      initial_bookings: 0,
      additional_services: 0,
    }) || {
      transaction_count: 0,
      booking_count: 0,
      gross_earnings: 0,
      platform_fees: 0,
      net_earnings: 0,
      initial_bookings: 0,
      additional_services: 0,
    };

    // Get previous period for comparison
    const prevPeriodStart = new Date(periodStart);
    prevPeriodStart.setDate(prevPeriodStart.getDate() - periodDays);
    
    const { data: prevPeriodData, error: prevPeriodError } = await supabase
      .from('business_earnings_by_period')
      .select('*')
      .eq('business_id', business_id)
      .gte('period_date', prevPeriodStart.toISOString().split('T')[0])
      .lt('period_date', periodStart.toISOString().split('T')[0])
      .order('period_date', { ascending: false });

    if (prevPeriodError) {
      console.error('Error fetching previous period data:', prevPeriodError);
    }

    const prevPeriodSummary = prevPeriodData?.reduce((acc, day) => {
      acc.net_earnings += parseFloat(day.net_earnings || 0);
      acc.booking_count += day.booking_count || 0;
      return acc;
    }, {
      net_earnings: 0,
      booking_count: 0,
    }) || {
      net_earnings: 0,
      booking_count: 0,
    };

    // Calculate growth percentages
    const revenueChange = prevPeriodSummary.net_earnings > 0
      ? ((periodSummary.net_earnings - prevPeriodSummary.net_earnings) / prevPeriodSummary.net_earnings) * 100
      : 0;
    
    const bookingsChange = prevPeriodSummary.booking_count > 0
      ? ((periodSummary.booking_count - prevPeriodSummary.booking_count) / prevPeriodSummary.booking_count) * 100
      : 0;

    // 3. Get monthly earnings for current tax year
    const { data: monthlyEarnings, error: monthlyError } = await supabase
      .from('business_monthly_earnings')
      .select('*')
      .eq('business_id', business_id)
      .eq('tax_year', currentYear)
      .order('month_start', { ascending: false })
      .limit(12);

    if (monthlyError) {
      console.error('Error fetching monthly earnings:', monthlyError);
    }

    // 4. Get earnings by service
    const { data: earningsByService, error: serviceError } = await supabase
      .from('business_earnings_by_service')
      .select('*')
      .eq('business_id', business_id)
      .order('total_net_earnings', { ascending: false })
      .limit(10);

    if (serviceError) {
      console.error('Error fetching earnings by service:', serviceError);
    }

    // 5. Get recent detailed transactions
    const { data: recentTransactions, error: transactionsError } = await supabase
      .from('business_earnings_detailed')
      .select('*')
      .eq('business_id', business_id)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(50);

    if (transactionsError) {
      console.error('Error fetching recent transactions:', transactionsError);
    }

    // Calculate average order value
    const averageOrderValue = periodSummary.booking_count > 0
      ? periodSummary.net_earnings / periodSummary.booking_count
      : 0;

    // Calculate completion rate (would need bookings data for this)
    // For now, we'll use transaction count as a proxy
    const completionRate = periodSummary.initial_bookings > 0
      ? (periodSummary.initial_bookings / (periodSummary.initial_bookings + periodSummary.additional_services)) * 100
      : 0;

    return res.status(200).json({
      summary: summary || {
        total_transactions: 0,
        total_bookings: 0,
        total_gross_earnings: 0,
        total_platform_fees: 0,
        total_net_earnings: 0,
        tax_year: currentYear,
      },
      period_summary: {
        ...periodSummary,
        average_order_value: averageOrderValue,
        revenue_change: revenueChange,
        bookings_change: bookingsChange,
        period_days: periodDays,
        period_start: periodStart.toISOString(),
      },
      monthly_earnings: monthlyEarnings || [],
      earnings_by_service: earningsByService || [],
      recent_transactions: recentTransactions || [],
      calculated_metrics: {
        average_order_value: averageOrderValue,
        completion_rate: completionRate,
      },
    });

  } catch (error: any) {
    console.error('Unexpected error in financial-summary handler:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}

