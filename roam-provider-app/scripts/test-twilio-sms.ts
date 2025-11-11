/**
 * Local test script for Twilio SMS functionality
 * 
 * Usage:
 *   cd roam-provider-app
 *   npx tsx scripts/test-twilio-sms.ts [phone_number]
 * 
 * Example:
 *   npx tsx scripts/test-twilio-sms.ts 5044171014
 * 
 * Make sure your .env file has:
 *   TWILIO_ACCOUNT_SID=your_account_sid
 *   TWILIO_AUTH_TOKEN=your_auth_token
 *   TWILIO_PHONE_NUMBER=+1234567890
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function testTwilioSMS() {
  console.log('🧪 Testing Twilio SMS Configuration...\n');

  // Check environment variables
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER;

  console.log('📋 Environment Variables Check:');
  console.log(`  TWILIO_ACCOUNT_SID: ${accountSid ? `${accountSid.substring(0, 10)}...` : '❌ NOT SET'}`);
  console.log(`  TWILIO_AUTH_TOKEN: ${authToken ? `${authToken.substring(0, 10)}...` : '❌ NOT SET'}`);
  console.log(`  TWILIO_PHONE_NUMBER: ${fromNumber || '❌ NOT SET'}`);
  console.log('');

  if (!accountSid || !authToken || !fromNumber) {
    console.error('❌ Missing required Twilio environment variables!');
    console.error('   Please check your .env file.');
    process.exit(1);
  }

  // Test phone number formatting
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return phone;
    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
    return cleaned.startsWith('1') && cleaned.length === 11
      ? `+${cleaned}`
      : cleaned.length === 10
      ? `+1${cleaned}`
      : phone.startsWith('+')
      ? phone
      : `+${cleaned}`;
  };

  // Get test phone number from command line or use default
  const testPhone = process.argv[2] || '5044171014';
  const formattedTo = formatPhoneNumber(testPhone);
  const formattedFrom = formatPhoneNumber(fromNumber);

  console.log('📱 Phone Number Formatting:');
  console.log(`  To: ${testPhone} → ${formattedTo}`);
  console.log(`  From: ${fromNumber} → ${formattedFrom}`);
  console.log('');

  // Initialize Twilio client
  console.log('🔌 Initializing Twilio client...');
  const client = twilio(accountSid, authToken);

  // Test authentication by fetching account info
  try {
    console.log('🔐 Testing authentication...');
    const account = await client.api.accounts(accountSid).fetch();
    console.log(`✅ Authentication successful!`);
    console.log(`   Account Name: ${account.friendlyName}`);
    console.log(`   Account Status: ${account.status}`);
    console.log('');
  } catch (authError: any) {
    console.error('❌ Authentication failed!');
    console.error(`   Error: ${authError.message}`);
    console.error(`   Code: ${authError.code}`);
    console.error(`   Status: ${authError.status}`);
    console.error(`   More Info: ${authError.moreInfo}`);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Verify TWILIO_ACCOUNT_SID matches your Twilio Account SID');
    console.error('   2. Verify TWILIO_AUTH_TOKEN matches your Twilio Auth Token');
    console.error('   3. Check that credentials are correct in Twilio Console');
    console.error('   4. Ensure credentials are not expired or revoked');
    process.exit(1);
  }

  // Test SMS sending (only if phone number provided)
  if (process.argv[2]) {
    console.log('📤 Sending test SMS...');
    try {
      const message = await client.messages.create({
        body: 'Test SMS from ROAM Provider App - Twilio integration test',
        from: formattedFrom,
        to: formattedTo,
      });

      console.log(`✅ SMS sent successfully!`);
      console.log(`   Message SID: ${message.sid}`);
      console.log(`   Status: ${message.status}`);
      console.log(`   To: ${message.to}`);
      console.log(`   From: ${message.from}`);
      console.log('');
    } catch (smsError: any) {
      console.error('❌ SMS sending failed!');
      console.error(`   Error: ${smsError.message}`);
      console.error(`   Code: ${smsError.code}`);
      console.error(`   Status: ${smsError.status}`);
      console.error(`   More Info: ${smsError.moreInfo}`);
      console.error('');
      console.error('💡 Troubleshooting:');
      console.error('   1. Verify TWILIO_PHONE_NUMBER is a valid Twilio phone number');
      console.error('   2. Check that the phone number is verified in Twilio (for trial accounts)');
      console.error('   3. Ensure the "to" number is verified (for trial accounts)');
      console.error('   4. Check Twilio Console for any account restrictions');
      process.exit(1);
    }
  } else {
    console.log('ℹ️  Skipping SMS send test (no phone number provided)');
    console.log('   To test SMS sending, run:');
    console.log(`   npx ts-node scripts/test-twilio-sms.ts ${testPhone}`);
    console.log('');
  }

  console.log('✅ All tests passed!');
}

// Run the test
testTwilioSMS().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});

