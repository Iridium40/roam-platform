-- Quick SQL queries to verify webhook is working

-- 1. Check if financial_transactions are being created
SELECT 
  id,
  booking_id,
  amount,
  transaction_type,
  status,
  created_at
FROM financial_transactions 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Check if payment_transactions (splits) are being created
SELECT 
  id,
  booking_id,
  transaction_type,
  amount,
  destination_account,
  status,
  created_at
FROM payment_transactions 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Check recent bookings with payment status
SELECT 
  id,
  booking_date,
  booking_status,
  payment_status,
  stripe_payment_intent_id,
  created_at
FROM bookings 
WHERE payment_status = 'completed'
ORDER BY created_at DESC 
LIMIT 5;

-- 4. Count total transactions (should increase after webhook fires)
SELECT 
  (SELECT COUNT(*) FROM financial_transactions) as financial_count,
  (SELECT COUNT(*) FROM payment_transactions) as payment_splits_count;

