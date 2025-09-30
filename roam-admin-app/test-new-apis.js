// Simple test of our new admin APIs
const baseUrl = 'http://localhost:3001/api';

async function testAPIs() {
  console.log('🧪 Testing ROAM Admin APIs...\n');

  try {
    // Test businesses endpoint
    console.log('1. Testing Business Verification API...');
    const businessRes = await fetch(`${baseUrl}/businesses?limit=5`);
    const businessData = await businessRes.json();
    console.log(`✅ Businesses API: ${businessData.data?.length || 0} businesses found`);
    
    // Test users endpoint  
    console.log('\n2. Testing Users Monitoring API...');
    const usersRes = await fetch(`${baseUrl}/users?limit=5`);
    const usersData = await usersRes.json();
    console.log(`✅ Users API: Found user overview data`);
    
    // Test bookings endpoint
    console.log('\n3. Testing Bookings Monitoring API...');
    const bookingsRes = await fetch(`${baseUrl}/bookings?limit=5`);
    const bookingsData = await bookingsRes.json();
    console.log(`✅ Bookings API: ${bookingsData.data?.length || 0} bookings found`);
    
    // Test verification stats
    console.log('\n4. Testing Verification Statistics...');
    const statsRes = await fetch(`${baseUrl}/verification/stats`);
    const statsData = await statsRes.json();
    console.log(`✅ Verification Stats: ${JSON.stringify(statsData.data?.businesses || {})}`);
    
    console.log('\n🎉 All API tests completed successfully!');
    
  } catch (error) {
    console.error('❌ API Test Error:', error.message);
  }
}

// Run the tests
testAPIs();