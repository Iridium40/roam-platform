-- Migration: Fix financial views to exclude reversed (refunded) transactions
-- This ensures that when a booking is cancelled and refunded, the revenue
-- doesn't show in the provider's financial dashboard

-- First, backfill any existing transactions that should be marked as reversed
-- Look for business_payment_transactions where there's a corresponding refund in financial_transactions
UPDATE business_payment_transactions bpt
SET 
  transfer_reversed = true,
  transfer_reversed_at = COALESCE(ft.processed_at, ft.created_at, NOW())
FROM financial_transactions ft
WHERE ft.booking_id = bpt.booking_id
  AND ft.transaction_type = 'refund'
  AND ft.status = 'completed'
  AND bpt.transfer_reversed = false;

-- Also mark reversed based on booking status being cancelled
UPDATE business_payment_transactions bpt
SET 
  transfer_reversed = true,
  transfer_reversed_at = NOW()
FROM bookings b
WHERE b.id = bpt.booking_id
  AND b.booking_status = 'cancelled'
  AND bpt.transfer_reversed = false;

-- View 1: Business Earnings Summary (aggregated totals)
-- Now excludes reversed transactions
CREATE OR REPLACE VIEW business_earnings_summary AS
SELECT 
    business_id,
    tax_year,
    COUNT(*) as total_transactions,
    COUNT(DISTINCT booking_id) as total_bookings,
    SUM(gross_payment_amount) as total_gross_earnings,
    SUM(platform_fee) as total_platform_fees,
    SUM(net_payment_amount) as total_net_earnings,
    MIN(payment_date) as first_payment_date,
    MAX(payment_date) as last_payment_date,
    -- Transaction type breakdown
    COUNT(*) FILTER (WHERE transaction_type = 'initial_booking') as initial_booking_count,
    COUNT(*) FILTER (WHERE transaction_type = 'additional_service') as additional_service_count,
    SUM(gross_payment_amount) FILTER (WHERE transaction_type = 'initial_booking') as initial_booking_gross,
    SUM(gross_payment_amount) FILTER (WHERE transaction_type = 'additional_service') as additional_service_gross,
    SUM(net_payment_amount) FILTER (WHERE transaction_type = 'initial_booking') as initial_booking_net,
    SUM(net_payment_amount) FILTER (WHERE transaction_type = 'additional_service') as additional_service_net
FROM business_payment_transactions
WHERE transfer_reversed = false OR transfer_reversed IS NULL
GROUP BY business_id, tax_year;

COMMENT ON VIEW business_earnings_summary IS 'Aggregated earnings summary per business per tax year (excludes reversed/refunded transactions)';

-- View 2: Business Earnings by Period (for date range queries)
-- Now excludes reversed transactions
CREATE OR REPLACE VIEW business_earnings_by_period AS
SELECT 
    business_id,
    DATE_TRUNC('day', payment_date) as period_date,
    DATE_TRUNC('month', payment_date) as period_month,
    DATE_TRUNC('year', payment_date) as period_year,
    tax_year,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT booking_id) as booking_count,
    SUM(gross_payment_amount) as gross_earnings,
    SUM(platform_fee) as platform_fees,
    SUM(net_payment_amount) as net_earnings,
    -- Transaction type breakdown
    COUNT(*) FILTER (WHERE transaction_type = 'initial_booking') as initial_bookings,
    COUNT(*) FILTER (WHERE transaction_type = 'additional_service') as additional_services
FROM business_payment_transactions
WHERE transfer_reversed = false OR transfer_reversed IS NULL
GROUP BY 
    business_id,
    DATE_TRUNC('day', payment_date),
    DATE_TRUNC('month', payment_date),
    DATE_TRUNC('year', payment_date),
    tax_year;

COMMENT ON VIEW business_earnings_by_period IS 'Earnings aggregated by day, month, and year for trend analysis (excludes reversed/refunded transactions)';

-- View 3: Business Earnings with Booking Details (for detailed reporting)
-- Now includes transfer_reversed status and excludes reversed by default
DROP VIEW IF EXISTS business_earnings_detailed;

CREATE VIEW business_earnings_detailed AS
SELECT 
    bpt.id,
    bpt.business_id,
    bpt.booking_id,
    bpt.payment_date,
    bpt.gross_payment_amount,
    bpt.platform_fee,
    bpt.net_payment_amount,
    bpt.tax_year,
    bpt.transaction_type,
    bpt.stripe_payment_intent_id,
    bpt.stripe_transfer_id,
    bpt.stripe_connect_account_id,
    bpt.booking_reference,
    bpt.transaction_description,
    bpt.created_at,
    bpt.transfer_reversed,
    bpt.transfer_reversed_at,
    -- Booking details
    b.booking_date,
    b.booking_status,
    b.total_amount as booking_total_amount,
    b.service_id,
    b.provider_id,
    -- Service details
    s.name as service_name,
    s.min_price as service_price,
    -- Customer details
    cp.first_name as customer_first_name,
    cp.last_name as customer_last_name
FROM business_payment_transactions bpt
LEFT JOIN bookings b ON bpt.booking_id = b.id
LEFT JOIN services s ON b.service_id = s.id
LEFT JOIN customer_profiles cp ON b.customer_id = cp.user_id
WHERE bpt.transfer_reversed = false OR bpt.transfer_reversed IS NULL;

COMMENT ON VIEW business_earnings_detailed IS 'Detailed earnings view with booking, service, customer, and provider information (excludes reversed/refunded transactions)';

-- View 4: Business Earnings by Service (for service performance analysis)
-- Now excludes reversed transactions
CREATE OR REPLACE VIEW business_earnings_by_service AS
SELECT 
    bpt.business_id,
    b.service_id,
    s.name as service_name,
    COUNT(DISTINCT bpt.booking_id) as booking_count,
    COUNT(*) as transaction_count,
    SUM(bpt.gross_payment_amount) as total_gross_earnings,
    SUM(bpt.platform_fee) as total_platform_fees,
    SUM(bpt.net_payment_amount) as total_net_earnings,
    AVG(bpt.gross_payment_amount) as avg_gross_per_transaction,
    AVG(bpt.net_payment_amount) as avg_net_per_transaction,
    MIN(bpt.payment_date) as first_payment_date,
    MAX(bpt.payment_date) as last_payment_date
FROM business_payment_transactions bpt
INNER JOIN bookings b ON bpt.booking_id = b.id
LEFT JOIN services s ON b.service_id = s.id
WHERE bpt.transfer_reversed = false OR bpt.transfer_reversed IS NULL
GROUP BY 
    bpt.business_id,
    b.service_id,
    s.name;

COMMENT ON VIEW business_earnings_by_service IS 'Earnings aggregated by service for performance analysis (excludes reversed/refunded transactions)';

-- View 5: Business Monthly Earnings (for YTD and trend analysis)
-- Now excludes reversed transactions
CREATE OR REPLACE VIEW business_monthly_earnings AS
SELECT 
    business_id,
    tax_year,
    DATE_TRUNC('month', payment_date)::date as month_start,
    TO_CHAR(DATE_TRUNC('month', payment_date), 'YYYY-MM') as month_key,
    COUNT(*) as transaction_count,
    COUNT(DISTINCT booking_id) as booking_count,
    SUM(gross_payment_amount) as gross_earnings,
    SUM(platform_fee) as platform_fees,
    SUM(net_payment_amount) as net_earnings
FROM business_payment_transactions
WHERE transfer_reversed = false OR transfer_reversed IS NULL
GROUP BY 
    business_id,
    tax_year,
    DATE_TRUNC('month', payment_date);

COMMENT ON VIEW business_monthly_earnings IS 'Monthly earnings summary for trend analysis and YTD calculations (excludes reversed/refunded transactions)';

-- Add index to support the new filter
CREATE INDEX IF NOT EXISTS idx_business_payment_transactions_reversed 
ON business_payment_transactions(transfer_reversed)
WHERE transfer_reversed = true;
