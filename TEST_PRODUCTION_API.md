# Test Production API

## Instructions

1. **Log in to roamprovider.app**
2. **Open Browser DevTools** (F12 or Right-click → Inspect)
3. **Go to Console tab**
4. **Run this code:**

```javascript
// Get your auth token
const session = await (await import('/src/lib/supabase.ts')).supabase.auth.getSession();
const token = session?.data?.session?.access_token || localStorage.getItem('roam_access_token');

console.log('🔑 Token:', token ? token.substring(0, 20) + '...' : 'MISSING!');

// Get your business ID from provider data
const provider = JSON.parse(localStorage.getItem('roam_provider') || '{}');
const businessId = provider.business_id;

console.log('🏢 Business ID:', businessId);

// Test the API
const response = await fetch(`/api/business/service-eligibility?business_id=${businessId}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
});

console.log('📡 Response Status:', response.status, response.statusText);

const data = await response.json();
console.log('📦 Response Data:', data);

// Check if we got categories
if (data.approved_categories && data.approved_categories.length > 0) {
  console.log('✅ SUCCESS! Found', data.approved_categories.length, 'categories');
  console.log('Categories:', data.approved_categories.map(c => c.category_name));
} else if (data.error) {
  console.error('❌ ERROR:', data.error);
  console.error('Message:', data.message);
  if (data.debug) console.error('Debug:', data.debug);
} else {
  console.warn('⚠️ No categories found');
}
```

---

## Expected Results

### ✅ **If Working:**
```
🔑 Token: eyJhbGciOiJIUzI1NiIs...
🏢 Business ID: abc-123-def-456...
📡 Response Status: 200 OK
📦 Response Data: { business_id: '...', approved_categories: [...] }
✅ SUCCESS! Found 3 categories
Categories: ['Haircut & Styling', 'Nails', 'Massage']
```

### ❌ **If Token Missing:**
```
🔑 Token: MISSING!
📡 Response Status: 401 Unauthorized
❌ ERROR: Authentication required
```

**Fix:** Log out and log back in

### ❌ **If Business ID Wrong:**
```
🏢 Business ID: undefined
📡 Response Status: 400 Bad Request
❌ ERROR: Business ID is required
```

**Fix:** Your provider record doesn't have business_id set

### ❌ **If Wrong Business:**
```
📡 Response Status: 403 Forbidden
❌ ERROR: Access denied
Message: You do not have permission to access this business
Debug: { your_business_id: 'abc-123', requested_business_id: 'xyz-789' }
```

**Fix:** Business ID mismatch in provider record

### ⚠️ **If No Categories:**
```
📡 Response Status: 200 OK
⚠️ No categories found
```

**Fix:** No categories assigned to your business in database

---

## Alternative: Check Network Tab

If you don't want to run the script:

1. Go to **Business Settings → Services** tab
2. Open **DevTools → Network tab**
3. Filter by "service-eligibility"
4. Look at the request and response

**Check Request Headers:**
- Should have `Authorization: Bearer eyJ...`

**Check Response:**
- Status should be 200
- Response body should have `approved_categories` array

---

## What to Share

If it's still not working, share:

1. **Console output** from the test script above
2. **Network tab screenshot** showing the API request/response
3. **Any error messages** in the console

This will tell us exactly what's failing! 🔍
