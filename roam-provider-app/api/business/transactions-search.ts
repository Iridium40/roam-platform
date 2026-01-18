import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

/**
 * GET /api/business/transactions-search
 * 
 * Server-side search and filtering for transactions with pagination
 * 
 * Query params:
 * - business_id: UUID of the business (required)
 * - search: Search query for booking ref, customer name, service (optional)
 * - start_date: Start date filter YYYY-MM-DD (optional)
 * - end_date: End date filter YYYY-MM-DD (optional)
 * - provider_id: Filter by provider UUID (optional)
 * - service_id: Filter by service UUID (optional)
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * 
 * Returns:
 * - transactions: Array of matching transactions
 * - pagination: { page, limit, total, totalPages }
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

    const { 
      business_id, 
      search,
      start_date,
      end_date,
      provider_id,
      service_id,
      page = '1',
      limit = '20'
    } = req.query;

    if (!business_id || typeof business_id !== 'string') {
      return res.status(400).json({ error: 'business_id is required' });
    }

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    // Build the query for business_payment_transactions (main transaction table)
    let query = supabase
      .from('business_payment_transactions')
      .select(`
        *,
        bookings (
          booking_reference,
          provider_id,
          service_id,
          customer_profiles (
            first_name,
            last_name
          ),
          services (
            name
          ),
          providers (
            first_name,
            last_name
          )
        )
      `, { count: 'exact' })
      .eq('business_id', business_id);

    // Apply date filters
    if (start_date && typeof start_date === 'string') {
      query = query.gte('payment_date', start_date);
    }
    if (end_date && typeof end_date === 'string') {
      // Add one day to include the end date
      const endDatePlusOne = new Date(end_date);
      endDatePlusOne.setDate(endDatePlusOne.getDate() + 1);
      query = query.lt('payment_date', endDatePlusOne.toISOString().split('T')[0]);
    }

    // Apply ordering
    query = query.order('payment_date', { ascending: false })
                 .order('created_at', { ascending: false });

    // Execute main query with pagination
    const { data: transactions, error: transactionsError, count } = await query
      .range(offset, offset + limitNum - 1);

    if (transactionsError) {
      console.error('Error fetching transactions:', transactionsError);
      return res.status(500).json({ 
        error: 'Failed to fetch transactions',
        details: transactionsError.message 
      });
    }

    // Client-side filtering for search and provider/service
    // (These fields require joining with nested data that Supabase doesn't filter server-side easily)
    let filteredTransactions = transactions || [];

    // Filter by provider
    if (provider_id && typeof provider_id === 'string' && provider_id !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => {
        const booking = Array.isArray(t.bookings) ? t.bookings[0] : t.bookings;
        return booking?.provider_id === provider_id;
      });
    }

    // Filter by service
    if (service_id && typeof service_id === 'string' && service_id !== 'all') {
      filteredTransactions = filteredTransactions.filter(t => {
        const booking = Array.isArray(t.bookings) ? t.bookings[0] : t.bookings;
        return booking?.service_id === service_id || t.service_name === service_id;
      });
    }

    // Apply search filter
    if (search && typeof search === 'string' && search.trim()) {
      const searchLower = search.toLowerCase().trim();
      filteredTransactions = filteredTransactions.filter(t => {
        const booking = Array.isArray(t.bookings) ? t.bookings[0] : t.bookings;
        
        // Search in booking reference
        const bookingRef = (t.booking_reference || booking?.booking_reference || '').toLowerCase();
        if (bookingRef.includes(searchLower)) return true;
        
        // Search in customer name
        const customerName = `${t.customer_first_name || booking?.customer_profiles?.first_name || ''} ${t.customer_last_name || booking?.customer_profiles?.last_name || ''}`.toLowerCase();
        if (customerName.includes(searchLower)) return true;
        
        // Search in service name
        const serviceName = (t.service_name || booking?.services?.name || '').toLowerCase();
        if (serviceName.includes(searchLower)) return true;
        
        // Search in transaction description
        const description = (t.transaction_description || '').toLowerCase();
        if (description.includes(searchLower)) return true;
        
        return false;
      });
    }

    // Calculate total for filtered results
    // Note: When filters are applied client-side, we need to re-count
    const totalFiltered = filteredTransactions.length;
    const totalPages = Math.ceil(totalFiltered / limitNum);

    // If we filtered client-side, we need to re-paginate
    const needsClientPagination = provider_id || service_id || search;
    const finalTransactions = needsClientPagination
      ? filteredTransactions.slice(0, limitNum) // Already at page 1 offset since we filtered full results
      : filteredTransactions;

    return res.status(200).json({
      transactions: finalTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: needsClientPagination ? totalFiltered : (count || 0),
        totalPages: needsClientPagination ? totalPages : Math.ceil((count || 0) / limitNum),
      },
      filters: {
        search: search || null,
        start_date: start_date || null,
        end_date: end_date || null,
        provider_id: provider_id || null,
        service_id: service_id || null,
      }
    });

  } catch (error: any) {
    console.error('Unexpected error in transactions-search handler:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message,
    });
  }
}
