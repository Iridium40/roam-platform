-- Create comprehensive admin financial view
-- This view aggregates all financial data for the ROAM admin dashboard

CREATE OR REPLACE VIEW admin_financial_overview AS
SELECT 
    -- Transaction identification
    ft.id as transaction_id,
    ft.booking_id,
    ft.created_at as transaction_date,
    DATE_TRUNC('day', ft.created_at)::date as transaction_day,
    DATE_TRUNC('month', ft.created_at)::date as transaction_month,
    DATE_TRUNC('year', ft.created_at)::date as transaction_year,
    
    -- Transaction details
    ft.transaction_type,
    ft.status as transaction_status,
    ft.amount as transaction_amount,
    ft.currency,
    ft.stripe_transaction_id,
    ft.payment_method,
    ft.description,
    ft.processed_at,
    
    -- Booking details
    b.booking_reference,
    b.booking_status,
    b.booking_date,
    b.start_time,
    b.total_amount as booking_total_amount,
    b.service_fee as booking_service_fee,
    b.remaining_balance as booking_remaining_balance,
    b.payment_status,
    
    -- Business details
    bp.id as business_id,
    bp.business_name,
    
    -- Customer details
    cp.id as customer_id,
    cp.first_name as customer_first_name,
    cp.last_name as customer_last_name,
    CONCAT(cp.first_name, ' ', cp.last_name) as customer_name,
    cp.email as customer_email,
    
    -- Service details
    s.id as service_id,
    s.name as service_name,
    
    -- Platform fee calculation
    -- For booking_payment transactions, platform fee is 20% of service amount
    -- Service amount = total_amount - service_fee, or total_amount / 1.2
    CASE 
        WHEN ft.transaction_type = 'booking_payment' THEN
            COALESCE(
                b.service_fee,
                (ft.amount / 1.2) * 0.2  -- Calculate 20% if service_fee not set
            )
        WHEN ft.transaction_type = 'tip' THEN
            0  -- Tips don't have platform fees
        ELSE
            0
    END as platform_fee_amount,
    
    -- Net amount (what business receives)
    CASE 
        WHEN ft.transaction_type = 'booking_payment' THEN
            ft.amount - COALESCE(
                b.service_fee,
                (ft.amount / 1.2) * 0.2
            )
        WHEN ft.transaction_type = 'tip' THEN
            0  -- Tips go to providers, not businesses
        ELSE
            ft.amount
    END as net_amount,
    
    -- Business payment transaction details (if exists)
    bpt.id as business_payment_transaction_id,
    bpt.payment_date as business_payment_date,
    bpt.gross_payment_amount as business_gross_amount,
    bpt.platform_fee as business_platform_fee,
    bpt.net_payment_amount as business_net_amount,
    bpt.transaction_type as business_transaction_type,
    bpt.stripe_transfer_id,
    bpt.stripe_connect_account_id,
    
    -- Tip details (if transaction is a tip)
    t.id as tip_id,
    t.tip_amount as tip_amount,
    t.provider_id as tip_provider_id,
    t.payment_status as tip_status,
    
    -- Provider details (for tips)
    p.first_name as provider_first_name,
    p.last_name as provider_last_name,
    CONCAT(p.first_name, ' ', p.last_name) as provider_name
    
FROM financial_transactions ft
LEFT JOIN bookings b ON ft.booking_id = b.id
LEFT JOIN business_profiles bp ON b.business_id = bp.id
LEFT JOIN customer_profiles cp ON b.customer_id = cp.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN business_payment_transactions bpt 
    ON ft.booking_id = bpt.booking_id 
    AND ft.stripe_transaction_id = bpt.stripe_payment_intent_id
LEFT JOIN tips t 
    ON ft.booking_id = t.booking_id 
    AND ft.transaction_type = 'tip'
LEFT JOIN providers p ON t.provider_id = p.id
WHERE ft.status = 'completed'  -- Only include completed transactions
ORDER BY ft.created_at DESC;

COMMENT ON VIEW admin_financial_overview IS 
'Comprehensive financial overview for ROAM admin dashboard. Aggregates data from financial_transactions, bookings, business_payment_transactions, and tips.';

-- Create a summary view for quick stats
CREATE OR REPLACE VIEW admin_financial_summary AS
SELECT 
    DATE_TRUNC('day', transaction_date)::date as summary_date,
    DATE_TRUNC('month', transaction_date)::date as summary_month,
    DATE_TRUNC('year', transaction_date)::date as summary_year,
    
    -- Transaction counts
    COUNT(*) as total_transactions,
    COUNT(DISTINCT booking_id) as total_bookings,
    COUNT(DISTINCT business_id) as total_businesses,
    COUNT(DISTINCT customer_id) as total_customers,
    
    -- Revenue totals
    SUM(transaction_amount) as total_revenue,
    SUM(platform_fee_amount) as total_platform_fees,
    SUM(net_amount) as total_net_amount,
    
    -- Revenue by transaction type
    SUM(transaction_amount) FILTER (WHERE transaction_type = 'booking_payment') as booking_revenue,
    SUM(transaction_amount) FILTER (WHERE transaction_type = 'tip') as tip_revenue,
    SUM(transaction_amount) FILTER (WHERE transaction_type = 'refund') as refund_amount,
    
    -- Platform fees by transaction type
    SUM(platform_fee_amount) FILTER (WHERE transaction_type = 'booking_payment') as booking_platform_fees,
    
    -- Net amounts by transaction type
    SUM(net_amount) FILTER (WHERE transaction_type = 'booking_payment') as booking_net_amount,
    
    -- Transaction type counts
    COUNT(*) FILTER (WHERE transaction_type = 'booking_payment') as booking_transaction_count,
    COUNT(*) FILTER (WHERE transaction_type = 'tip') as tip_transaction_count,
    COUNT(*) FILTER (WHERE transaction_type = 'refund') as refund_count,
    
    -- Average transaction amounts
    AVG(transaction_amount) as avg_transaction_amount,
    AVG(platform_fee_amount) as avg_platform_fee,
    AVG(net_amount) as avg_net_amount
    
FROM admin_financial_overview
GROUP BY 
    DATE_TRUNC('day', transaction_date),
    DATE_TRUNC('month', transaction_date),
    DATE_TRUNC('year', transaction_date)
ORDER BY summary_date DESC;

COMMENT ON VIEW admin_financial_summary IS 
'Daily, monthly, and yearly financial summaries for admin dashboard analytics and charts.';

-- Create indexes to support these views
CREATE INDEX IF NOT EXISTS idx_financial_transactions_created_at 
ON financial_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_type_status 
ON financial_transactions(transaction_type, status);

CREATE INDEX IF NOT EXISTS idx_financial_transactions_booking_id 
ON financial_transactions(booking_id);

CREATE INDEX IF NOT EXISTS idx_business_payment_transactions_payment_intent 
ON business_payment_transactions(stripe_payment_intent_id);

