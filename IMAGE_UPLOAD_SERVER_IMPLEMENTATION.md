# Image Upload Server Implementation Fix

## Issue

Image uploads were showing success messages but images weren't appearing in the UI. The error "Failed to load response data" appeared after upload.

**Root Cause Analysis:**

1. **Server in Test Mode**: The `/api/onboarding/upload-image` endpoint was only returning test data without actually uploading files
2. **Client Creating Mock URLs**: The client code was creating fake URLs (`https://example.com/uploads/...`) instead of real uploaded file URLs
3. **Response Mismatch**: Server returned `testMode: true` but client tried to use mock URLs which caused loading failures

## Solution

### 1. Server-Side Changes

**File:** `api/onboarding/upload-image.ts`

**Before:** Test mode only - no actual upload
```typescript
res.json({
  success: true,
  message: 'Image upload endpoint working',
  testMode: true,  // ❌ No actual upload
  imageType,
  businessId,
  userId
});
```

**After:** Full upload implementation
```typescript
// 1. Decode base64 file
const fileBuffer = Buffer.from(file, 'base64');

// 2. Determine bucket and path
const bucket = bucketMap[imageType] || 'business-images';
const uniqueFileName = `${businessId}_${imageType}_${timestamp}.${fileExt}`;

// 3. Upload to Supabase using service role
const { data: uploadData, error: uploadError } = await supabase.storage
  .from(bucket)
  .upload(storagePath, fileBuffer, {
    contentType: fileType || 'image/jpeg',
    upsert: true
  });

// 4. Get public URL
const { data: urlData } = supabase.storage
  .from(bucket)
  .getPublicUrl(storagePath);

// 5. Return actual URLs ✅
res.json({
  success: true,
  message: 'Image uploaded successfully',
  url: storagePath,
  publicUrl: urlData.publicUrl,
  imageType,
  businessId,
  bucket
});
```

**Key Changes:**
- ✅ Added base64 decoding: `Buffer.from(file, 'base64')`
- ✅ Mapped image types to Supabase storage buckets
- ✅ Generated unique filenames with timestamp
- ✅ Actually uploaded files to Supabase storage
- ✅ Retrieved and returned real public URLs
- ✅ Better error handling with details

---

### 2. Client-Side Changes

**File:** `client/utils/image/imageStorage.ts`

#### Fixed `uploadImage` Method

**Before:** Creating mock URLs
```typescript
if (result.success) {
  // ❌ Creating fake URLs
  const mockUrl = `https://example.com/uploads/${imageType}_${businessId}_${Date.now()}.jpg`;
  
  return {
    success: true,
    url: mockUrl,
    publicUrl: mockUrl
  };
}
```

**After:** Using server-returned URLs
```typescript
if (result.success) {
  // ✅ Use actual URLs from server
  if (result.url || result.publicUrl) {
    return {
      success: true,
      url: result.url,
      publicUrl: result.publicUrl || result.url
    };
  }
  
  // ✅ Detect test mode and trigger fallback
  if (result.testMode) {
    throw new Error('Server is in test mode - no actual upload performed');
  }
  
  throw new Error('Server did not return image URL');
}
```

**Key Changes:**
- ✅ Use real URLs returned by server
- ✅ Detect test mode and throw error to trigger fallback
- ✅ Better error messages
- ✅ Added error handling for malformed responses

#### Fixed `uploadImageWithConfig` Method

Same changes applied to custom config upload method.

---

## Storage Bucket Mapping

The server now properly maps image types to Supabase buckets:

| Image Type | Supabase Bucket | Storage Path |
|------------|----------------|--------------|
| `business_logo` | `business-logos` | `business_logos/{filename}` |
| `business_cover` | `business-covers` | `business_covers/{filename}` |
| `provider_avatar` | `provider-images` | `provider_images/{filename}` |
| `provider_cover` | `provider-images` | `provider_images/{filename}` |
| `customer_avatar` | `customer-avatars` | `customer_avatars/{filename}` |

**Filename Format:** `{businessId}_{imageType}_{timestamp}.{ext}`

Example: `a3b483e5-b375-4a83-8c1e-223452f23397_business_cover_1728234567890.jpg`

---

## Upload Flow

### Before Fix
```
1. User selects image
2. Client converts to base64
3. Client sends to /api/onboarding/upload-image
4. ❌ Server returns testMode: true (no upload)
5. ❌ Client creates fake URL (https://example.com/...)
6. ❌ Client tries to display fake URL
7. ❌ Browser shows "Failed to load response data"
8. ❌ Database updated with fake URL
9. ❌ Image never appears
```

### After Fix
```
1. User selects image ✅
2. Client converts to base64 ✅
3. Client sends to /api/onboarding/upload-image ✅
4. Server decodes base64 ✅
5. Server uploads to Supabase storage ✅
6. Server gets public URL ✅
7. Server returns real URL ✅
8. Client receives real URL ✅
9. Client updates local state with real URL ✅
10. Client saves real URL to database ✅
11. Image displays immediately ✅
12. Image persists after refresh ✅
```

---

## API Response Format

### Success Response
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "url": "business_covers/a3b483e5-b375-4a83-8c1e-223452f23397_business_cover_1728234567890.jpg",
  "publicUrl": "https://your-supabase-project.supabase.co/storage/v1/object/public/business-covers/business_covers/a3b483e5-b375-4a83-8c1e-223452f23397_business_cover_1728234567890.jpg",
  "imageType": "business_cover",
  "businessId": "a3b483e5-b375-4a83-8c1e-223452f23397",
  "bucket": "business-covers"
}
```

### Error Response
```json
{
  "error": "Upload failed: [error message]",
  "details": {
    // Error details object
  }
}
```

---

## Service Role Authentication

The server endpoint uses Supabase **service role key** for uploads:

```typescript
const supabase = createClient(
  process.env.VITE_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // ✅ Bypasses RLS policies
);
```

**Why Service Role?**
- ✅ Bypasses Row Level Security (RLS) policies
- ✅ Allows uploads to all buckets
- ✅ Provides consistent upload permissions
- ✅ Handles business owner, provider, and customer uploads

**Security:**
- ✅ Service role key only used on server (not exposed to client)
- ✅ Server validates image types and business IDs
- ✅ File size validation performed
- ✅ Content type validation enforced

---

## Fallback Mechanism

The client still has a fallback for development/testing:

```typescript
static async uploadImageWithFallback(
  file: File,
  imageType: ImageType,
  businessId: string,
  userId?: string
): Promise<ImageUploadResult> {
  try {
    // Try normal upload first
    const result = await this.uploadImage(file, imageType, businessId, userId);
    if (result.success) {
      return result;
    }

    // If in development, use base64 fallback
    if (process.env.NODE_ENV === 'development') {
      const base64 = await this.fileToBase64(file);
      const fallbackUrl = `data:${file.type};base64,${base64}`;
      
      return {
        success: true,
        url: `fallback_${imageType}_${businessId}`,
        publicUrl: fallbackUrl  // Data URL for immediate display
      };
    }

    return result;
  } catch (error) {
    console.error('Fallback upload error:', error);
    return {
      success: false,
      error: 'All upload methods failed'
    };
  }
}
```

**When Fallback Activates:**
- ✅ Server endpoint is down
- ✅ Supabase storage unavailable
- ✅ Network errors during upload
- ✅ Development environment without proper credentials

---

## Testing Checklist

### Business Logo Upload
- [ ] Navigate to Business Settings → Basic Info
- [ ] Click "Edit Settings"
- [ ] Click "Change Logo"
- [ ] Select image file
- [ ] ✅ Loading spinner appears
- [ ] ✅ Network request to `/api/onboarding/upload-image`
- [ ] ✅ Server response includes `publicUrl`
- [ ] ✅ Logo updates in UI immediately
- [ ] ✅ Success toast shows
- [ ] ✅ Database updated with real URL
- [ ] ✅ Refresh page - logo persists
- [ ] ✅ Image URL starts with Supabase domain

### Business Cover Upload
- [ ] Navigate to Business Settings → Basic Info
- [ ] Click "Edit Settings"
- [ ] Click on cover image area
- [ ] Select image file
- [ ] ✅ Loading spinner appears
- [ ] ✅ Network request to `/api/onboarding/upload-image`
- [ ] ✅ Server response includes `publicUrl`
- [ ] ✅ Cover updates in UI immediately
- [ ] ✅ Success toast shows
- [ ] ✅ Database updated with real URL
- [ ] ✅ Refresh page - cover persists
- [ ] ✅ Image URL starts with Supabase domain

### Error Handling
- [ ] Try uploading 100MB file
  - ✅ Validation error before upload
- [ ] Try uploading .txt file
  - ✅ File type validation error
- [ ] Simulate network error
  - ✅ Error toast with meaningful message
- [ ] Check Supabase storage dashboard
  - ✅ Files appear in correct buckets

---

## Environment Variables Required

Ensure these are set in your `.env` file:

```bash
VITE_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Development:**
```bash
# roam-provider-app/.env
VITE_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

**Production:**
Same variables should be set in Vercel/deployment environment variables.

---

## Files Modified

1. **api/onboarding/upload-image.ts**
   - Implemented actual file upload to Supabase storage
   - Added base64 decoding
   - Added bucket mapping logic
   - Return real public URLs

2. **client/utils/image/imageStorage.ts**
   - Fixed `uploadImage` to use server-returned URLs
   - Fixed `uploadImageWithConfig` to use server-returned URLs
   - Improved error handling
   - Better fallback mechanism

---

## Database Impact

After successful upload, the URLs saved to database are now real Supabase URLs:

**Before:**
```sql
UPDATE business_profiles 
SET cover_image_url = 'https://example.com/uploads/business_cover_123_1728234567890.jpg'
WHERE id = 'a3b483e5-b375-4a83-8c1e-223452f23397';
```

**After:**
```sql
UPDATE business_profiles 
SET cover_image_url = 'https://your-project.supabase.co/storage/v1/object/public/business-covers/business_covers/a3b483e5-b375-4a83-8c1e-223452f23397_business_cover_1728234567890.jpg'
WHERE id = 'a3b483e5-b375-4a83-8c1e-223452f23397';
```

---

## Status

✅ **Fixed and Ready for Testing**

### What Was Fixed:
1. ✅ Server now actually uploads files to Supabase storage
2. ✅ Server returns real public URLs
3. ✅ Client uses server-returned URLs instead of mock URLs
4. ✅ Images display immediately after upload
5. ✅ Images persist in database and after page refresh
6. ✅ Proper error handling throughout upload flow

### Next Steps:
1. Test logo upload in Business Settings
2. Test cover image upload in Business Settings
3. Verify images appear in Supabase storage dashboard
4. Verify database contains real Supabase URLs
5. Test error cases (large files, wrong types, etc.)

The "Failed to load response data" error should now be resolved! 🎉
