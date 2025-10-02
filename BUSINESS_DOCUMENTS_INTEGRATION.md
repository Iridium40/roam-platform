# 📄 Business Documents Integration

**Created**: 2025-10-02  
**Purpose**: Enable businesses to upload, manage, and track verification status of required compliance documents

---

## 📋 Overview

This document describes the implementation of the business documents feature, which allows businesses to:
- Upload required verification documents (business license, insurance, tax ID)
- Upload optional documents (certifications, portfolio)
- View document verification status
- Track document expiry dates
- Receive admin feedback on rejected documents

### Key Features

- **Document Upload**: Upload files to Supabase storage
- **Metadata Management**: Track document details in `business_documents` table
- **Verification Workflow**: Admin review and approval process
- **Expiry Tracking**: Automatic warnings for expiring documents
- **File Management**: Delete documents and associated storage files

---

## 🗄️ Database Schema

### `business_documents` Table

```sql
create table public.business_documents (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,
  document_type public.business_document_type not null,
  document_name character varying(255) not null,
  file_url text not null,
  file_size_bytes integer null,
  verification_status public.business_document_status null,
  verified_by uuid null,
  verified_at timestamp without time zone null,
  rejection_reason text null,
  expiry_date date null,
  created_at timestamp without time zone null default now(),
  constraint provider_documents_pkey primary key (id),
  constraint business_documents_business_id_fkey 
    foreign KEY (business_id) references business_profiles (id),
  constraint provider_documents_verified_by_fkey 
    foreign KEY (verified_by) references admin_users (id)
);

-- Indexes for performance
create index idx_business_documents_business_id 
  on public.business_documents using btree (business_id);

create index idx_business_documents_document_type 
  on public.business_documents using btree (document_type);

create index idx_business_documents_verification_status 
  on public.business_documents using btree (verification_status);
```

### Key Fields

- **id**: UUID primary key
- **business_id**: Foreign key to `business_profiles`
- **document_type**: Enum (business_license, insurance_certificate, tax_id, certifications, portfolio, other)
- **document_name**: Original filename
- **file_url**: Public URL in Supabase storage
- **file_size_bytes**: File size for display
- **verification_status**: Enum (pending, approved, rejected)
- **verified_by**: Foreign key to `admin_users` who reviewed
- **verified_at**: Timestamp of approval/rejection
- **rejection_reason**: Admin feedback if rejected
- **expiry_date**: Optional expiration date for tracking
- **created_at**: Upload timestamp

### Enum Types

```sql
-- Document types
CREATE TYPE business_document_type AS ENUM (
  'business_license',
  'insurance_certificate',
  'tax_id',
  'certifications',
  'portfolio',
  'other'
);

-- Verification status
CREATE TYPE business_document_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);
```

---

## 💾 Storage Configuration

### Supabase Storage Bucket

**Bucket Name**: `provider-documents`

**Path Pattern**: `provider-documents/{business_id}/{document_type}_{timestamp}.{ext}`

**Example URLs**:
```
https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/provider-documents/provider-documents/040688ef-96af-4431-90dd-b143457b9663/business_license_1755714466055.png
```

### Bucket Configuration

```typescript
// Required bucket settings in Supabase Dashboard
{
  "name": "provider-documents",
  "public": true,  // Allow public read access
  "fileSizeLimit": 10485760,  // 10MB max file size
  "allowedMimeTypes": [
    "image/jpeg",
    "image/png", 
    "image/jpg",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ]
}
```

### Storage Policies (RLS)

```sql
-- Allow authenticated users to upload to their own business folder
CREATE POLICY "Users can upload to own business folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public read access
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'provider-documents');

-- Allow users to delete their own documents
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'provider-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## 🔌 API Implementation

### Endpoint: `/api/business/documents`

**File**: `roam-provider-app/api/business/documents.ts`

#### GET - Fetch Documents

**Request**:
```http
GET /api/business/documents?business_id={uuid}
```

**Response**:
```json
{
  "business_id": "uuid",
  "document_count": 5,
  "documents": [
    {
      "id": "doc-uuid",
      "business_id": "business-uuid",
      "document_type": "business_license",
      "document_name": "Business License 2025.pdf",
      "document_url": "https://...supabase.co/.../business_license_1755714466055.pdf",
      "file_url": "https://...supabase.co/.../business_license_1755714466055.pdf",
      "file_size_bytes": 2458624,
      "upload_status": "approved",
      "verification_status": "approved",
      "verified_by": "admin-uuid",
      "verified_at": "2025-09-15T14:30:00Z",
      "rejection_reason": null,
      "expiry_date": "2026-12-31",
      "uploaded_at": "2025-09-01T10:00:00Z",
      "created_at": "2025-09-01T10:00:00Z",
      "original_filename": "Business License 2025.pdf",
      "verifier": {
        "id": "admin-uuid",
        "name": "John Admin",
        "email": "admin@roam.com"
      }
    }
  ]
}
```

#### POST - Upload Document

**Request**:
```http
POST /api/business/documents
Content-Type: application/json

{
  "business_id": "uuid",
  "document_type": "business_license",
  "document_name": "Business License 2025.pdf",
  "file_url": "https://...supabase.co/.../business_license_1755714466055.pdf",
  "file_size_bytes": 2458624,
  "expiry_date": "2026-12-31"
}
```

**Response (201 Created)**:
```json
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "doc-uuid",
    "business_id": "business-uuid",
    "document_type": "business_license",
    "document_name": "Business License 2025.pdf",
    "document_url": "https://...supabase.co/.../business_license_1755714466055.pdf",
    "file_url": "https://...supabase.co/.../business_license_1755714466055.pdf",
    "file_size_bytes": 2458624,
    "upload_status": "pending",
    "verification_status": "pending",
    "verified_by": null,
    "verified_at": null,
    "rejection_reason": null,
    "expiry_date": "2026-12-31",
    "uploaded_at": "2025-10-02T12:00:00Z",
    "created_at": "2025-10-02T12:00:00Z",
    "original_filename": "Business License 2025.pdf",
    "verifier": null
  }
}
```

#### DELETE - Remove Document

**Request**:
```http
DELETE /api/business/documents?business_id={uuid}&document_id={uuid}
```

**Response (200 OK)**:
```json
{
  "message": "Document deleted successfully"
}
```

---

## 🎨 Frontend Implementation

### Documents Section Component

**File**: `roam-provider-app/client/pages/dashboard/components/business-settings/DocumentsSection.tsx`

**Key Features**:
- Grouped document types (required vs optional)
- File upload with drag-and-drop support
- Verification status badges
- Expiry date warnings
- Rejection reason display
- Document preview/download
- Delete functionality

### Document Upload Flow

```typescript
// 1. User selects file
const handleFileUpload = async (file: File, documentType: string) => {
  // 2. Upload to Supabase storage
  const filePath = `provider-documents/${businessId}/${documentType}_${timestamp}.${ext}`;
  const { data: uploadData } = await supabase.storage
    .from('provider-documents')
    .upload(filePath, file);

  // 3. Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('provider-documents')
    .getPublicUrl(filePath);

  // 4. Save metadata via API
  await fetch('/api/business/documents', {
    method: 'POST',
    body: JSON.stringify({
      business_id: businessId,
      document_type: documentType,
      document_name: file.name,
      file_url: publicUrl,
      file_size_bytes: file.size
    })
  });

  // 5. Reload documents list
  await loadBusinessDocuments();
};
```

### Document Types

**Required Documents**:
1. **Business License**: Valid business registration or license
2. **Insurance Certificate**: Current liability insurance certificate
3. **Tax ID Document**: EIN or Tax ID verification

**Optional Documents**:
1. **Professional Certifications**: Industry-specific certifications
2. **Portfolio/Work Samples**: Examples of work
3. **Other Documentation**: Additional supporting documents

### Status Badges

- 🟢 **Approved**: Green badge, document verified by admin
- 🟡 **Pending**: Yellow badge, awaiting admin review
- 🔴 **Rejected**: Red badge, document needs resubmission

### Expiry Warnings

- **Expired**: Red alert, document past expiry date
- **Expiring Soon**: Yellow alert, expires within 30 days
- **Valid**: No warning

---

## 🔄 Upload Workflow

### Step-by-Step Process

```
1. User Selects File
   └─> File validation (size, type)
       └─> Show upload progress
           
2. Upload to Supabase Storage
   └─> Path: provider-documents/{business_id}/{type}_{timestamp}.{ext}
       └─> Get public URL
           
3. Save Metadata to Database
   └─> Call POST /api/business/documents
       └─> Create record with status='pending'
           
4. Display in UI
   └─> Show pending status badge
       └─> Notify user: "Document uploaded, awaiting review"
           
5. Admin Review (separate admin flow)
   └─> Admin approves → status='approved', verified_at=now()
   └─> Admin rejects → status='rejected', rejection_reason='...'
       
6. User Sees Updated Status
   └─> Approved: Can proceed with verification
   └─> Rejected: Must reupload with corrections
```

---

## 🔐 Admin Verification Workflow

### Admin Actions (Future Implementation)

**Approve Document**:
```sql
UPDATE business_documents
SET 
  verification_status = 'approved',
  verified_by = '{admin_user_id}',
  verified_at = NOW(),
  rejection_reason = NULL
WHERE id = '{document_id}';
```

**Reject Document**:
```sql
UPDATE business_documents
SET 
  verification_status = 'rejected',
  verified_by = '{admin_user_id}',
  verified_at = NOW(),
  rejection_reason = 'Document is blurry and illegible. Please upload a clearer image.'
WHERE id = '{document_id}';
```

**Check Required Documents**:
```sql
-- Check if business has all required approved documents
SELECT 
  bp.business_name,
  COUNT(CASE WHEN bd.document_type = 'business_license' AND bd.verification_status = 'approved' THEN 1 END) as has_license,
  COUNT(CASE WHEN bd.document_type = 'insurance_certificate' AND bd.verification_status = 'approved' THEN 1 END) as has_insurance,
  COUNT(CASE WHEN bd.document_type = 'tax_id' AND bd.verification_status = 'approved' THEN 1 END) as has_tax_id
FROM business_profiles bp
LEFT JOIN business_documents bd ON bp.id = bd.business_id
WHERE bp.id = '{business_id}'
GROUP BY bp.id, bp.business_name;
```

---

## 🧪 Testing Scenarios

### Scenario 1: First Document Upload

```bash
# Setup: New business, no documents

# Request: Upload business license
POST /api/business/documents
{
  "business_id": "uuid",
  "document_type": "business_license",
  "document_name": "Business License.pdf",
  "file_url": "https://...supabase.co/.../business_license_1755714466055.pdf",
  "file_size_bytes": 2458624
}

# Response: 201 Created
{
  "message": "Document uploaded successfully",
  "document": {
    "id": "doc-uuid",
    "verification_status": "pending",
    "uploaded_at": "2025-10-02T12:00:00Z"
  }
}

# UI: Shows pending badge, awaiting review message
```

### Scenario 2: Multiple Documents Same Type

```bash
# Setup: Business already has pending business license

# Action: Upload another business license
POST /api/business/documents
{
  "business_id": "uuid",
  "document_type": "business_license",
  "document_name": "Updated Business License.pdf",
  "file_url": "https://...supabase.co/.../business_license_1755714466056.pdf",
  "file_size_bytes": 2500000
}

# Response: 201 Created (allows multiple versions)
# UI: Shows both documents, admin will review latest
```

### Scenario 3: Document with Expiry Date

```bash
# Request: Upload with expiry date
POST /api/business/documents
{
  "business_id": "uuid",
  "document_type": "insurance_certificate",
  "document_name": "Insurance 2025.pdf",
  "file_url": "https://...supabase.co/.../insurance_certificate_1755714466057.pdf",
  "file_size_bytes": 1800000,
  "expiry_date": "2025-11-01"
}

# Response: 201 Created
# UI: Shows expiry warning (expires in 30 days)
```

### Scenario 4: Delete Document

```bash
# Request: Delete pending document
DELETE /api/business/documents?business_id={uuid}&document_id={doc_uuid}

# Response: 200 OK
{
  "message": "Document deleted successfully"
}

# Backend: Deletes from database AND storage
# UI: Document removed from list
```

### Scenario 5: Fetch All Documents

```bash
# Request: Get all documents
GET /api/business/documents?business_id={uuid}

# Response: 200 OK
{
  "business_id": "uuid",
  "document_count": 3,
  "documents": [
    { "document_type": "business_license", "verification_status": "approved" },
    { "document_type": "insurance_certificate", "verification_status": "pending" },
    { "document_type": "tax_id", "verification_status": "rejected", "rejection_reason": "..." }
  ]
}

# UI: Shows all documents with status badges
```

---

## 📊 Database Queries

### Get Documents for Business

```sql
SELECT 
  bd.*,
  au.first_name,
  au.last_name,
  au.email as verifier_email
FROM business_documents bd
LEFT JOIN admin_users au ON bd.verified_by = au.id
WHERE bd.business_id = '{business_id}'
ORDER BY bd.created_at DESC;
```

### Check Verification Completeness

```sql
-- Businesses missing required documents
SELECT 
  bp.id,
  bp.business_name,
  CASE WHEN lic.id IS NULL THEN false ELSE true END as has_license,
  CASE WHEN ins.id IS NULL THEN false ELSE true END as has_insurance,
  CASE WHEN tax.id IS NULL THEN false ELSE true END as has_tax_id
FROM business_profiles bp
LEFT JOIN business_documents lic 
  ON bp.id = lic.business_id 
  AND lic.document_type = 'business_license' 
  AND lic.verification_status = 'approved'
LEFT JOIN business_documents ins 
  ON bp.id = ins.business_id 
  AND ins.document_type = 'insurance_certificate' 
  AND ins.verification_status = 'approved'
LEFT JOIN business_documents tax 
  ON bp.id = tax.business_id 
  AND tax.document_type = 'tax_id' 
  AND tax.verification_status = 'approved'
WHERE 
  lic.id IS NULL 
  OR ins.id IS NULL 
  OR tax.id IS NULL;
```

### Expiring Documents Report

```sql
-- Documents expiring in next 30 days
SELECT 
  bp.business_name,
  bp.contact_email,
  bd.document_type,
  bd.document_name,
  bd.expiry_date,
  CURRENT_DATE - bd.expiry_date as days_until_expiry
FROM business_documents bd
JOIN business_profiles bp ON bd.business_id = bp.id
WHERE 
  bd.expiry_date IS NOT NULL
  AND bd.expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
  AND bd.verification_status = 'approved'
ORDER BY bd.expiry_date ASC;
```

---

## 🚨 Error Handling

### Upload Errors

**File Too Large**:
```json
{
  "error": "File size exceeds 10MB limit",
  "max_size_bytes": 10485760,
  "file_size_bytes": 15000000
}
```

**Invalid File Type**:
```json
{
  "error": "Invalid file type",
  "allowed_types": ["pdf", "jpg", "png", "doc", "docx"],
  "received_type": "exe"
}
```

**Storage Upload Failed**:
```json
{
  "error": "Upload failed: Storage quota exceeded"
}
```

### API Errors

**Business Not Found**:
```json
{
  "error": "Business not found"
}
```

**Document Not Found**:
```json
{
  "error": "Document not found"
}
```

**Missing Required Fields**:
```json
{
  "error": "business_id, document_type, document_name, and file_url are required"
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Supabase connection (already configured)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### File Size Limits

```typescript
// Frontend validation
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Supabase bucket limit
{
  "fileSizeLimit": 10485760  // 10MB
}
```

### Allowed File Types

```typescript
const ALLOWED_TYPES = [
  'application/pdf',           // .pdf
  'image/jpeg',                // .jpg, .jpeg
  'image/png',                 // .png
  'application/msword',        // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  // .docx
];
```

---

## 📚 Related Documentation

- [DATABASE_SCHEMA_REFERENCE.md](./DATABASE_SCHEMA_REFERENCE.md) - Database schema reference
- [API_ARCHITECTURE.md](./API_ARCHITECTURE.md) - API patterns and standards
- [BUSINESS_LOCATIONS_INTEGRATION.md](./BUSINESS_LOCATIONS_INTEGRATION.md) - Similar feature implementation

---

## 🚀 Deployment Checklist

- [x] Create `/api/business/documents` endpoint
- [x] Implement GET method (fetch documents)
- [x] Implement POST method (upload metadata)
- [x] Implement DELETE method (remove document)
- [x] Create Supabase storage bucket `provider-documents`
- [x] Configure bucket as public
- [x] Set up storage RLS policies
- [x] Add document upload handler in frontend
- [x] Add document delete handler in frontend
- [x] Integrate with DocumentsSection component
- [x] Add loading states and error handling
- [x] Add toast notifications
- [ ] Test file uploads in production
- [ ] Test file deletions in production
- [ ] Verify storage policies work correctly
- [ ] Create admin verification UI
- [ ] Add email notifications for document status changes
- [ ] Implement expiry date reminders
- [ ] Add document preview functionality

---

**Last Updated**: 2025-10-02  
**Status**: ✅ Implementation Complete, Pending Production Testing
