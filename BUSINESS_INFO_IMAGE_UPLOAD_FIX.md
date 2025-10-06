# Business Info Image Upload Fix

## Issue
The provider business info page showed successful toast notifications when uploading cover and logo images, but the images were not appearing in the UI after upload.

## Root Causes

### 1. **Wrong Upload Handler Called for Cover Image**
**File:** `BasicInfoSection.tsx` (line 85)

**Problem:** The cover image upload input was calling `onLogoUpload(file)` instead of `onCoverUpload(file)`.

```tsx
// BEFORE (INCORRECT)
<input
  id="cover-upload"
  type="file"
  accept="image/*"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) onLogoUpload(file);  // ❌ Wrong handler!
  }}
/>
```

**Result:** Cover images were being uploaded as logos, which is why:
- The upload succeeded (toast showed success)
- The cover image didn't update in UI
- The logo might have been overwritten unexpectedly

---

### 2. **Missing Props for Cover Upload**
**File:** `BasicInfoSection.tsx` (interface)

**Problem:** The component interface was missing `onCoverUpload` and `coverUploading` props.

```tsx
// BEFORE (INCOMPLETE)
interface BasicInfoSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  logoUploading: boolean;
  onLogoUpload: (file: File) => void;
  // ❌ Missing: onCoverUpload and coverUploading
}
```

---

### 3. **Parent Component Not Passing Cover Upload Props**
**File:** `BusinessSettingsTabRefactored.tsx` (line 433-441)

**Problem:** The parent component wasn't passing `onCoverUpload` and `coverUploading` to `BasicInfoSection`.

```tsx
// BEFORE (INCOMPLETE)
<BasicInfoSection
  businessData={businessData}
  setBusinessData={setBusinessData}
  isEditing={isEditing}
  onSave={saveBusinessSettings}
  onCancel={cancelEditing}
  onEdit={() => setIsEditing(true)}
  logoUploading={logoUploading}
  onLogoUpload={handleLogoUpload}
  // ❌ Missing: coverUploading and onCoverUpload
/>
```

---

### 4. **Image URLs Not Persisted to Database**
**File:** `useBusinessSettings.ts` (lines 236-273, 278-315)

**Problem:** After successful file upload to storage, the image URLs were only updated in local React state but **not saved to the database**.

```tsx
// BEFORE (INCOMPLETE)
const handleLogoUpload = async (file: File) => {
  // ... upload logic ...
  
  setBusinessData(prev => ({ ...prev, logo_url: result.publicUrl! }));
  
  // ❌ No database update!
  toast({ title: "Success", description: "Logo uploaded successfully." });
};
```

**Result:** 
- Toast showed "success" (upload to storage worked)
- Local state updated temporarily
- Page refresh reverted to old image (database not updated)
- UI didn't reflect the uploaded image immediately

---

## Solutions Implemented

### 1. ✅ Fixed Cover Image Upload Handler
**File:** `BasicInfoSection.tsx`

```tsx
// AFTER (CORRECT)
<input
  id="cover-upload"
  type="file"
  accept="image/*"
  className="hidden"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) onCoverUpload(file);  // ✅ Correct handler!
  }}
  disabled={coverUploading || !isEditing}  // ✅ Added disabled state
/>
```

**Changes:**
- ✅ Call `onCoverUpload(file)` instead of `onLogoUpload(file)`
- ✅ Added `disabled` attribute with `coverUploading` state

---

### 2. ✅ Added Missing Props to Interface
**File:** `BasicInfoSection.tsx`

```tsx
// AFTER (COMPLETE)
interface BasicInfoSectionProps {
  businessData: any;
  setBusinessData: (data: any) => void;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
  onEdit: () => void;
  logoUploading: boolean;
  coverUploading: boolean;          // ✅ Added
  onLogoUpload: (file: File) => void;
  onCoverUpload: (file: File) => void;  // ✅ Added
}

export default function BasicInfoSection({
  businessData,
  setBusinessData,
  isEditing,
  onSave,
  onCancel,
  onEdit,
  logoUploading,
  coverUploading,      // ✅ Added
  onLogoUpload,
  onCoverUpload,       // ✅ Added
}: BasicInfoSectionProps) {
```

---

### 3. ✅ Updated Parent Component Props
**File:** `BusinessSettingsTabRefactored.tsx`

```tsx
// AFTER (COMPLETE)
<BasicInfoSection
  businessData={businessData}
  setBusinessData={setBusinessData}
  isEditing={isEditing}
  onSave={saveBusinessSettings}
  onCancel={cancelEditing}
  onEdit={() => setIsEditing(true)}
  logoUploading={logoUploading}
  coverUploading={coverUploading}        // ✅ Added
  onLogoUpload={handleLogoUpload}
  onCoverUpload={handleCoverUpload}      // ✅ Added
/>
```

---

### 4. ✅ Added Database Persistence After Upload
**File:** `useBusinessSettings.ts`

#### Logo Upload Handler
```tsx
// AFTER (COMPLETE)
const handleLogoUpload = async (file: File) => {
  if (!business?.id) return;
  setLogoUploading(true);

  try {
    // Validate and upload file
    const validation = await ImageStorageService.validateImage(file, 'business_logo');
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const result = await ImageStorageService.uploadImageWithFallback(
      file,
      'business_logo',
      business.id
    );

    if (!result.success || !result.publicUrl) {
      throw new Error(result.error || 'Upload failed');
    }

    // ✅ Update local state
    setBusinessData(prev => ({ ...prev, logo_url: result.publicUrl! }));

    // ✅ Save to database immediately
    const { error: updateError } = await (supabase as any)
      .from("business_profiles")
      .update({ logo_url: result.publicUrl })
      .eq("id", business.id);

    if (updateError) {
      console.error("Error saving logo URL to database:", updateError);
      throw new Error("Failed to save logo URL to database");
    }

    toast({
      title: "Success",
      description: "Logo uploaded successfully.",
    });
  } catch (error: any) {
    console.error("Error uploading logo:", error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to upload logo. Please try again.",
      variant: "destructive",
    });
  } finally {
    setLogoUploading(false);
  }
};
```

#### Cover Image Upload Handler
```tsx
// AFTER (COMPLETE)
const handleCoverUpload = async (file: File) => {
  if (!business?.id) return;
  setCoverUploading(true);

  try {
    // Validate and upload file
    const validation = await ImageStorageService.validateImage(file, 'business_cover');
    if (!validation.isValid) {
      throw new Error(validation.errors.join(', '));
    }

    const result = await ImageStorageService.uploadImageWithFallback(
      file,
      'business_cover',
      business.id
    );

    if (!result.success || !result.publicUrl) {
      throw new Error(result.error || 'Upload failed');
    }

    // ✅ Update local state
    setBusinessData(prev => ({ ...prev, cover_image_url: result.publicUrl! }));

    // ✅ Save to database immediately
    const { error: updateError } = await (supabase as any)
      .from("business_profiles")
      .update({ cover_image_url: result.publicUrl })
      .eq("id", business.id);

    if (updateError) {
      console.error("Error saving cover image URL to database:", updateError);
      throw new Error("Failed to save cover image URL to database");
    }

    toast({
      title: "Success",
      description: "Cover photo uploaded successfully.",
    });
  } catch (error: any) {
    console.error("Error uploading cover photo:", error);
    toast({
      title: "Error",
      description: error instanceof Error ? error.message : "Failed to upload cover photo. Please try again.",
      variant: "destructive",
    });
  } finally {
    setCoverUploading(false);
  }
};
```

**Key Changes:**
1. ✅ After upload, immediately update database with new URL
2. ✅ If database update fails, throw error and show error toast
3. ✅ Only show success toast after both upload AND database update succeed

---

## Technical Flow

### Before Fix
```
1. User selects cover image
2. onLogoUpload() called (wrong!)
3. File uploaded to storage ✅
4. businessData.logo_url updated in state ✅
5. Toast shows "success" ✅
6. ❌ Database NOT updated
7. ❌ UI shows old cover image
8. ❌ Page refresh shows old image
```

### After Fix
```
1. User selects cover image
2. onCoverUpload() called ✅
3. File uploaded to storage ✅
4. businessData.cover_image_url updated in state ✅
5. Database updated with new URL ✅
6. Toast shows "success" ✅
7. UI immediately shows new cover image ✅
8. Page refresh shows new image ✅
```

---

## Database Schema Reference

The fix interacts with the `business_profiles` table:

```sql
-- business_profiles table columns
logo_url: TEXT              -- Business logo image URL
cover_image_url: TEXT       -- Business cover/banner image URL
```

**Update Query:**
```typescript
await supabase
  .from("business_profiles")
  .update({ logo_url: result.publicUrl })    // or cover_image_url
  .eq("id", business.id);
```

---

## Files Modified

1. **BasicInfoSection.tsx**
   - Added `coverUploading` and `onCoverUpload` to props interface
   - Changed cover image input to call `onCoverUpload` instead of `onLogoUpload`
   - Added disabled state to cover upload input

2. **BusinessSettingsTabRefactored.tsx**
   - Added `coverUploading={coverUploading}` prop
   - Added `onCoverUpload={handleCoverUpload}` prop

3. **useBusinessSettings.ts**
   - Added database update after logo upload
   - Added database update after cover image upload
   - Both handlers now persist URLs to `business_profiles` table

---

## Testing Checklist

### Logo Upload
- [ ] Navigate to Business Settings → Basic Info tab
- [ ] Click "Edit Settings"
- [ ] Click "Change Logo" button
- [ ] Select an image file
- [ ] ✅ Loading indicator appears
- [ ] ✅ Success toast shows "Logo uploaded successfully"
- [ ] ✅ Logo image updates in UI immediately
- [ ] ✅ Refresh page - logo persists
- [ ] ✅ Database shows new logo_url

### Cover Image Upload
- [ ] Navigate to Business Settings → Basic Info tab
- [ ] Click "Edit Settings"
- [ ] Click on cover image area
- [ ] Select an image file
- [ ] ✅ Loading indicator appears
- [ ] ✅ Success toast shows "Cover photo uploaded successfully"
- [ ] ✅ Cover image updates in UI immediately
- [ ] ✅ Refresh page - cover image persists
- [ ] ✅ Database shows new cover_image_url

### Error Handling
- [ ] Try uploading invalid file type
  - ✅ Error toast shows with validation message
- [ ] Try uploading oversized file
  - ✅ Error toast shows with size limit message
- [ ] Simulate database error
  - ✅ Error toast shows "Failed to save to database"

---

## Status

✅ **Fixed and Ready for Testing**

All four root causes have been addressed:
1. ✅ Cover upload now calls correct handler
2. ✅ Component props properly typed
3. ✅ Parent component passes all required props
4. ✅ Image URLs persisted to database after upload

The images will now update in the UI immediately after upload and persist across page refreshes.
