/**
 * Test script for business hours API endpoint
 * Tests both GET and PUT operations with format conversion
 */

const API_BASE = 'http://localhost:5178';

// Test business ID - replace with actual business ID from your database
const TEST_BUSINESS_ID = '65c6c4f1-c5c6-4bc9-8dc7-2a1234567890'; // Replace this!

async function testGetBusinessHours() {
  console.log('\n========================================');
  console.log('TEST 1: GET Business Hours');
  console.log('========================================\n');

  try {
    const response = await fetch(`${API_BASE}/api/business/hours?business_id=${TEST_BUSINESS_ID}`);
    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok && data.business_hours) {
      console.log('\n✅ GET request successful!');
      console.log('Sample day (monday):', data.business_hours.monday);
      return data.business_hours;
    } else {
      console.log('\n❌ GET request failed!');
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testUpdateBusinessHours() {
  console.log('\n========================================');
  console.log('TEST 2: PUT Business Hours');
  console.log('========================================\n');

  // Test data with mixed open/closed days
  const testHours = {
    monday: { open: "08:00", close: "18:00", closed: false },
    tuesday: { open: "08:00", close: "18:00", closed: false },
    wednesday: { open: "08:00", close: "18:00", closed: false },
    thursday: { open: "08:00", close: "18:00", closed: false },
    friday: { open: "08:00", close: "16:00", closed: false },
    saturday: { open: "10:00", close: "14:00", closed: false },
    sunday: { open: "09:00", close: "17:00", closed: true }, // Closed on Sunday
  };

  console.log('Sending hours:', JSON.stringify(testHours, null, 2));

  try {
    const response = await fetch(`${API_BASE}/api/business/hours`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        business_id: TEST_BUSINESS_ID,
        business_hours: testHours,
      }),
    });

    const data = await response.json();

    console.log('\nStatus:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ PUT request successful!');
      return true;
    } else {
      console.log('\n❌ PUT request failed!');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testFormatConversion() {
  console.log('\n========================================');
  console.log('TEST 3: Format Conversion Verification');
  console.log('========================================\n');

  // First update with specific hours
  console.log('Step 1: Updating hours...');
  const updateSuccess = await testUpdateBusinessHours();

  if (!updateSuccess) {
    console.log('❌ Update failed, cannot verify conversion');
    return;
  }

  // Wait a moment for database to update
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Then fetch to verify conversion
  console.log('\nStep 2: Fetching updated hours...');
  const hours = await testGetBusinessHours();

  if (hours) {
    console.log('\n✅ Format conversion test completed!');
    console.log('Verify that:');
    console.log('- Days are lowercase (monday, not Monday)');
    console.log('- Each day has open, close, and closed fields');
    console.log('- Sunday should be marked as closed');
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  Business Hours API Test Suite        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\n⚠️  IMPORTANT: Update TEST_BUSINESS_ID before running!');
  console.log(`Current ID: ${TEST_BUSINESS_ID}\n`);

  if (TEST_BUSINESS_ID === '65c6c4f1-c5c6-4bc9-8dc7-2a1234567890') {
    console.log('❌ Please update TEST_BUSINESS_ID with a real business ID from your database!');
    console.log('You can find business IDs by querying: SELECT id FROM business_profiles LIMIT 1;\n');
    return;
  }

  // Run tests sequentially
  await testGetBusinessHours();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testUpdateBusinessHours();
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  await testFormatConversion();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  All Tests Completed!                  ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// Run tests
runAllTests().catch(console.error);
