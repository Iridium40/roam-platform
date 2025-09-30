const testAPI = async () => {
  try {
    console.log('Testing /api/businesses endpoint...');
    const response = await fetch('http://localhost:5175/api/businesses');
    
    if (!response.ok) {
      console.error('Error response:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response body:', text);
      return;
    }
    
    const data = await response.json();
    console.log('Success! API returned:', data);
    console.log('Number of businesses:', data.data?.length || 0);
    
  } catch (error) {
    console.error('Fetch error:', error);
  }
};

testAPI();