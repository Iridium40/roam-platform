/**
 * Script to fix balance payment issues
 * Run with: node scripts/fix-tax-trigger.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env file manually
const envPath = path.join(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) envVars[match[1].trim()] = match[2].trim();
});

const supabaseUrl = envVars.VITE_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing VITE_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔧 Fixing balance payment issues...\n');

  console.log('⚠️ STEP 1: Run this SQL in Supabase SQL Editor to remove the trigger:');
  console.log('\n------- COPY THIS SQL -------\n');
  console.log(`DROP TRIGGER IF EXISTS track_business_payment_for_stripe_tax ON public.bookings;
DROP FUNCTION IF EXISTS public.track_business_payment_for_tax();`);
  console.log('\n------- END SQL -------\n');

  // Check for bookings that have deposits paid but balance not marked as charged
  console.log('📋 STEP 2: Checking for stuck bookings...\n');
  
  // Find deposit-type bookings that are accepted/completed with remaining balance
  const { data: depositBookings, error: bookingError } = await supabase
    .from('bookings')
    .select(`
      id, 
      booking_reference, 
      booking_status,
      payment_status,
      remaining_balance_charged,
      remaining_balance_charged_at,
      deposit_amount,
      total_amount,
      services!inner(pricing_type)
    `)
    .in('booking_status', ['accepted', 'completed'])
    .eq('remaining_balance_charged', false)
    .gt('deposit_amount', 0);

  if (bookingError) {
    console.error('Error checking bookings:', bookingError.message);
    
    // Try simpler query
    console.log('\nTrying simpler query...');
    const { data: simpleBookings, error: simpleError } = await supabase
      .from('bookings')
      .select('id, booking_reference, booking_status, payment_status, remaining_balance_charged, deposit_amount, total_amount')
      .eq('remaining_balance_charged', false)
      .gt('deposit_amount', 0);
    
    if (simpleError) {
      console.error('Simple query also failed:', simpleError.message);
    } else if (simpleBookings && simpleBookings.length > 0) {
      console.log(`\nFound ${simpleBookings.length} booking(s) with deposits not marked as balance charged:`);
      for (const b of simpleBookings) {
        console.log(`  - ${b.booking_reference}: status=${b.booking_status}, payment=${b.payment_status}, remaining_balance_charged=${b.remaining_balance_charged}`);
        console.log(`    deposit=$${b.deposit_amount}, total=$${b.total_amount}`);
      }
    } else {
      console.log('No stuck bookings found.');
    }
    return;
  }

  if (!depositBookings || depositBookings.length === 0) {
    console.log('No stuck deposit bookings found.');
  } else {
    console.log(`Found ${depositBookings.length} booking(s) that may need balance update:`);
    for (const b of depositBookings) {
      console.log(`  - ${b.booking_reference}: status=${b.booking_status}, payment=${b.payment_status}`);
      console.log(`    deposit=$${b.deposit_amount}, total=$${b.total_amount}`);
    }
  }

  // Also check the specific booking mentioned
  console.log('\n📋 Checking specific booking BK262M860001...');
  const { data: specificBooking, error: specificError } = await supabase
    .from('bookings')
    .select('id, booking_reference, booking_status, payment_status, remaining_balance_charged, remaining_balance_charged_at, deposit_amount, total_amount')
    .eq('booking_reference', 'BK262M860001')
    .single();

  if (specificError) {
    console.log('Could not find BK262M860001:', specificError.message);
  } else if (specificBooking) {
    console.log(`Found: ${specificBooking.booking_reference}`);
    console.log(`  status: ${specificBooking.booking_status}`);
    console.log(`  payment_status: ${specificBooking.payment_status}`);
    console.log(`  remaining_balance_charged: ${specificBooking.remaining_balance_charged}`);
    console.log(`  deposit: $${specificBooking.deposit_amount}`);
    console.log(`  total: $${specificBooking.total_amount}`);

    if (!specificBooking.remaining_balance_charged) {
      console.log('\n  🔄 Attempting to fix this booking...');
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          remaining_balance_charged: true,
          remaining_balance_charged_at: new Date().toISOString(),
          payment_status: 'paid'
        })
        .eq('id', specificBooking.id);

      if (updateError) {
        console.log(`  ❌ Failed: ${updateError.message} (code: ${updateError.code})`);
        if (updateError.code === '42P10') {
          console.log('  ⚠️ This error is caused by the trigger. Run the SQL above first!');
        }
      } else {
        console.log('  ✅ Fixed!');
      }
    } else {
      console.log('  ✅ Already marked as balance charged');
    }
  }

  console.log('\n✨ Done!');
}

main().catch(console.error);
