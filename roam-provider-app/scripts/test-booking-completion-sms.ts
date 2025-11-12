/**
 * Test script for booking completion SMS
 * 
 * Usage:
 *   cd roam-provider-app
 *   npx tsx scripts/test-booking-completion-sms.ts [phone_number] [booking_id]
 * 
 * Example:
 *   npx tsx scripts/test-booking-completion-sms.ts 5044171014 abc123-booking-id
 * 
 * This script tests the SMS functionality for booking completion by:
 * 1. Sending a test SMS directly (if phone number provided)
 * 2. Or updating a booking status to "completed" to trigger the real flow
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { sendSMS } from '../lib/notifications/sms-service.js';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function testBookingCompletionSMS() {
  console.log('🧪 Testing Booking Completion SMS...\n');

  // Check Twilio configuration
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  console.log('📋 Twilio Configuration Check:');
  console.log(`  TWILIO_ACCOUNT_SID: ${accountSid ? `${accountSid.substring(0, 10)}...` : '❌ NOT SET'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${authToken ? `${authToken.substring(0, 10)}...` : '❌ NOT SET'}`);
  console.log(`  TWILIO_PHONE_NUMBER: ${fromNumber || '❌ NOT SET'}`);
  console.log('');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ Missing required Twilio environment variables!');
    console.error('   Please check your .env file.');
    process.exit(1);
  }

  // Check Supabase configuration
  const supabaseUrl = process.env.VITE_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log('📋 Supabase Configuration Check:');
  console.log(`  VITE_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ SET' : '❌ NOT SET'}`);
  console.log('');

  const testPhone = process.argv[2];
  const bookingId = process.argv[3];

  // Test 1: Direct SMS test (if phone number provided)
  if (testPhone) {
    console.log('📱 Test 1: Direct SMS Test');
    console.log('─'.repeat(50));
    
    const testMessage = `ROAM: Thank you! Your Test Service with Test Provider on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} is complete. We hope you enjoyed your service! Reply STOP to opt out.`;
    
    try {
      console.log(`📤 Sending test SMS to ${testPhone}...`);
      const result = await sendSMS({ to: testPhone, body: testMessage });
      console.log(`✅ SMS sent successfully!`);
      console.log(`   Message SID: ${result.sid}`);
      console.log('');
    } catch (smsError: any) {
      console.error('❌ SMS sending failed!');
      console.error(`   Error: ${smsError.message}`);
      console.error(`   Code: ${smsError.code}`);
      console.error(`   Status: ${smsError.status}`);
      console.error('');
    }
  } else {
    console.log('ℹ️  Skipping direct SMS test (no phone number provided)');
    console.log('   To test direct SMS, run:');
    console.log(`   npx tsx scripts/test-booking-completion-sms.ts [phone_number]`);
    console.log('');
  }

  // Test 2: Full booking completion flow (if booking ID provided)
  if (bookingId && supabaseUrl && supabaseServiceKey) {
    console.log('📱 Test 2: Full Booking Completion Flow');
    console.log('─'.repeat(50));
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    try {
      // Fetch booking details
      console.log(`🔍 Fetching booking ${bookingId}...`);
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer_profiles (
            id,
            first_name,
            last_name,
            email,
            phone,
            user_id
          ),
          providers (
            id,
            first_name,
            last_name,
            email,
            phone,
            user_id
          ),
          business_profiles (
            id,
            business_name,
            business_address
          ),
          services (
            id,
            name
          )
        `)
        .eq('id', bookingId)
        .single();

      if (fetchError || !booking) {
        console.error(`❌ Failed to fetch booking: ${fetchError?.message || 'Not found'}`);
        process.exit(1);
      }

      console.log(`✅ Booking found:`);
      console.log(`   Customer: ${booking.customer_profiles?.first_name || 'N/A'}`);
      console.log(`   Service: ${booking.services?.name || 'N/A'}`);
      console.log(`   Status: ${booking.booking_status}`);
      console.log('');

      // Check customer phone number
      const customer = Array.isArray(booking.customer_profiles)
        ? booking.customer_profiles[0]
        : booking.customer_profiles;
      const customerPhone = customer?.phone || booking.guest_phone;

      if (!customerPhone) {
        console.warn('⚠️  No phone number found for customer');
        console.warn('   SMS will not be sent without a phone number');
        console.log('');
      } else {
        console.log(`📱 Customer phone: ${customerPhone}`);
      }

      // Check SMS notification settings
      if (customer?.user_id) {
        const { data: settings } = await supabase
          .from('user_settings')
          .select('sms_notifications, customer_booking_completed_sms')
          .eq('user_id', customer.user_id)
          .maybeSingle();

        console.log(`📋 SMS Settings:`);
        console.log(`   SMS Notifications Enabled: ${settings?.sms_notifications ? '✅' : '❌'}`);
        console.log(`   Booking Completion SMS Enabled: ${settings?.customer_booking_completed_sms ? '✅' : '❌'}`);
        console.log('');

        if (!settings?.sms_notifications && !settings?.customer_booking_completed_sms) {
          console.warn('⚠️  SMS notifications are disabled for this user');
          console.warn('   Enable SMS in user_settings to test the full flow');
          console.log('');
        }
      }

      // Update booking status to completed
      console.log(`🔄 Updating booking status to "completed"...`);
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({ booking_status: 'completed' })
        .eq('id', bookingId)
        .select()
        .single();

      if (updateError) {
        console.error(`❌ Failed to update booking: ${updateError.message}`);
        process.exit(1);
      }

      console.log(`✅ Booking status updated to "completed"`);
      console.log('');
      console.log('📝 Next steps:');
      console.log('   1. Check the API logs for SMS sending attempt');
      console.log('   2. Verify SMS was sent to customer phone');
      console.log('   3. Check notification_logs table for SMS delivery status');
      console.log('');

      // Note: The actual SMS sending happens in the API endpoint
      // This script just triggers it by updating the status
      console.log('💡 To trigger SMS via API:');
      console.log(`   POST /api/bookings/status-update`);
      console.log(`   Body: {`);
      console.log(`     "bookingId": "${bookingId}",`);
      console.log(`     "newStatus": "completed",`);
      console.log(`     "updatedBy": "test-user-id",`);
      console.log(`     "notifyCustomer": true`);
      console.log(`   }`);
      console.log('');

    } catch (error: any) {
      console.error('❌ Error during booking completion test:', error.message);
      process.exit(1);
    }
  } else {
    console.log('ℹ️  Skipping full flow test');
    if (!bookingId) {
      console.log('   No booking ID provided');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      console.log('   Supabase credentials missing');
    }
    console.log('');
    console.log('   To test full flow, run:');
    console.log(`   npx tsx scripts/test-booking-completion-sms.ts [phone_number] [booking_id]`);
    console.log('');
  }

  console.log('✅ Test completed!');
  console.log('');
  console.log('📚 Additional Information:');
  console.log('   - SMS is sent when booking status changes to "completed"');
  console.log('   - Requires: SMS enabled in user_settings, Twilio configured, customer phone number');
  console.log('   - SMS template: "ROAM: Thank you! Your {service} with {provider} on {date} is complete..."');
}

// Run the test
testBookingCompletionSMS().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

