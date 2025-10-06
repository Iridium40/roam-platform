# Provider Profile Photo Upload - Testing Guide

## Setup

1. **Rebuild Shared Package** (if you see TypeScript errors):
   ```bash
   cd /Users/alans/Desktop/ROAM/roam-platform/packages/shared
   npm run build
   ```

2. **Start Provider App**:
   ```bash
   cd /Users/alans/Desktop/ROAM/roam-platform/roam-provider-app
   npm run dev
   ```

3. **Login as Provider** and navigate to **Profile** tab in dashboard

## Test Cases

### Test 1: Upload Profile Avatar
1. Click "Change Photo" button under Profile Photo section
2. Select a square image (recommended: 400x400px)
3. Verify preview appears immediately
4. Image should upload automatically
5. Check for success toast notification
6. Verify avatar displays in the UI
7. Refresh page and verify avatar persists

**Expected Result**: ✅ Avatar photo uploaded and saved to database

### Test 2: Upload Cover Photo
1. Click "Upload Cover Photo" button (or "Change" if cover exists)
2. Select a banner image (recommended: 1200x400px, 3:1 ratio)
3. Verify preview appears immediately
4. Image should upload automatically
5. Check for success toast notification
6. Verify cover displays in the UI
7. Refresh page and verify cover persists

**Expected Result**: ✅ Cover photo uploaded and saved to database

### Test 3: File Size Validation
1. Try uploading an avatar image > 2MB
2. Should see error message: "File size must be less than 2MB"
3. Try uploading a cover image > 10MB
4. Should see error message: "File size must be less than 10MB"

**Expected Result**: ✅ Large files rejected with helpful message

### Test 4: File Format Validation
1. Try uploading a PDF or other non-image file
2. Should see error: "File must be JPG, PNG, or WebP format"

**Expected Result**: ✅ Invalid formats rejected

### Test 5: Remove Photos
1. Click "Remove" button under avatar
2. Avatar should be cleared
3. Click trash icon on cover photo
4. Cover should be cleared

**Expected Result**: ✅ Photos can be removed

### Test 6: Multiple Uploads
1. Upload avatar photo
2. Wait for success
3. Upload different avatar photo
4. Should replace previous one
5. Same for cover photo

**Expected Result**: ✅ New uploads replace old ones

## Database Verification

### Check Avatar URL in Database:
```sql
SELECT id, first_name, last_name, image_url, cover_image_url 
FROM public.providers 
WHERE user_id = '<your-user-id>';
```

### Expected URLs Format:
- Avatar: `https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/roam-file-storage/avatar-provider-user/{user_id}-{timestamp}.jpeg`
- Cover: `https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/roam-file-storage/cover-provider-user/{user_id}-{timestamp}.jpeg`

## Storage Verification

### Check in Supabase Dashboard:
1. Go to Storage → roam-file-storage
2. Navigate to `avatar-provider-user/` folder
3. Verify your uploaded avatar file exists
4. Navigate to `cover-provider-user/` folder
5. Verify your uploaded cover file exists

## Troubleshooting

### TypeScript Errors ("Argument of type ... is not assignable to parameter of type 'never'")

This is a type caching issue. Fix:

```bash
# 1. Rebuild shared package
cd packages/shared
npm run build

# 2. Restart TypeScript server in VS Code
# Press Cmd+Shift+P → "TypeScript: Restart TS Server"

# 3. If still having issues, rebuild provider app
cd ../roam-provider-app
rm -rf node_modules/.vite
npm run build
```

### Upload Fails with "Upload failed"

Check:
1. Supabase URL and anon key in `.env`
2. Storage bucket `roam-file-storage` exists
3. RLS policies allow uploads
4. Network connection is stable

### Images Don't Persist After Refresh

Check:
1. Database was actually updated (run SQL query above)
2. URLs are valid and accessible
3. Browser cache is not interfering

### Preview Shows But Upload Fails

Check browser console for errors:
- Network tab for API call details
- Console for JavaScript errors
- Look for CORS issues or authentication problems

## Success Indicators

✅ Avatar upload button works  
✅ Cover upload button works  
✅ Previews show immediately  
✅ Progress indicators display during upload  
✅ Success toast notifications appear  
✅ Photos persist after page reload  
✅ Photos display correctly in UI  
✅ Database contains correct URLs  
✅ Files exist in Supabase storage  
✅ File validation works (size, format)  
✅ Remove buttons work correctly  

## API Endpoints Used

- **Upload**: `/api/onboarding/upload-image` (POST)
  - Handles file conversion and storage upload
  - Returns public URL for uploaded file

- **Update Profile**: Supabase direct update
  - Updates `providers.image_url` or `providers.cover_image_url`
  - Uses authenticated Supabase client

## Component Hierarchy

```
ProfileTab
├── Profile Photo Section
│   ├── Avatar Display
│   ├── Change Photo Button
│   ├── Remove Button
│   └── File Input (hidden)
├── Cover Photo Section
│   ├── Cover Display
│   ├── Upload/Change Button
│   ├── Remove Button
│   └── File Input (hidden)
└── Form Fields
    ├── First Name
    ├── Last Name
    ├── Email
    ├── Phone
    └── Bio
```

## State Management

```typescript
// Upload progress tracking
uploadProgress: {
  profile: { 
    uploading: boolean;
    uploaded: boolean;
    error?: string;
  };
  cover: {
    uploading: boolean;
    uploaded: boolean;
    error?: string;
  };
}

// Preview URLs (cleaned up after upload)
profilePhotoPreview: string | null
coverPhotoPreview: string | null
```

---

**Questions or Issues?**
Check `/Users/alans/Desktop/ROAM/roam-platform/PROVIDER_PROFILE_PHOTO_UPLOAD.md` for detailed implementation notes.
