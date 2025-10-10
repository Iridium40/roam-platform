# Provider Agreement Integration - Implementation Guide

**Date**: October 9, 2025  
**Status**: Ready for Implementation  
**Impact**: All provider onboarding flows

## Overview

This guide shows how to integrate the Provider Services Agreement into all provider onboarding flows in the ROAM Provider App.

## Files Created

### 1. Legal Content
- **`client/lib/legal/provider-policy-content.ts`**
  - Complete provider agreement text (12 sections)
  - Version 1.0, Effective October 9, 2025
  - Covers all key terms: commission, contractor status, cancellations, conduct

### 2. React Component
- **`client/components/onboarding/ProviderPolicyAgreement.tsx`**
  - Mobile-responsive design
  - Scroll progress tracking
  - 4 required acknowledgment checkboxes
  - Download capability
  - Collapsible sections
  - IP address + user agent tracking

### 3. Database Migration
- **`add_provider_policy_agreement.sql`**
  - Creates `policy_acceptances` table
  - Adds RLS policies
  - Tracks acceptance metadata
  - Adds columns to `providers` table

## Database Setup

### Step 1: Run SQL Migration

```bash
# Connect to your Supabase database
psql <connection-string>

# Run the migration
\i add_provider_policy_agreement.sql
```

### Step 2: Verify Tables

```sql
-- Check policy_acceptances table
SELECT * FROM policy_acceptances LIMIT 5;

-- Check providers table has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'providers' 
AND column_name IN ('policy_accepted_at', 'policy_version');
```

### Step 3: Regenerate Database Types

```bash
cd roam-provider-app
npm run generate-types  # or your Supabase types generation command
```

## Integration Points

### A. Business Owner Onboarding (Phase 1)

**File**: `client/pages/onboarding/ProviderOnboardingPhase1.tsx`

**Current Steps**:
1. Account Creation (signup)
2. Business Information
3. Document Upload
4. Review & Submit

**Add Policy Agreement** as Step 1 (before signup):

```typescript
// Update phase1Steps array
const phase1Steps = [
  { id: "policy", title: "Provider Agreement", icon: FileText },
  { id: "signup", title: "Account Creation", icon: User },
  { id: "business_info", title: "Business Information", icon: Building },
  { id: "documents", title: "Document Upload", icon: FileText },
  { id: "review", title: "Review & Submit", icon: CheckCircle },
];

// Update Phase1Step type
type Phase1Step = "policy" | "signup" | "business_info" | "documents" | "review" | "submitted";

// Update Phase1State interface
interface Phase1State {
  phase1Step: Phase1Step;
  userData?: any;
  businessData?: any;
  documents?: any[];
  businessId?: string;
  userId?: string;
  policyAccepted?: boolean;  // Add this
}

// Import the component
import { ProviderPolicyAgreement } from "@/components/onboarding/ProviderPolicyAgreement";

// Add handler in component
const handlePolicyAccept = () => {
  setOnboardingState((prev) => ({
    ...prev,
    phase1Step: "signup",
    policyAccepted: true,
  }));
};

const handlePolicyDecline = () => {
  // Redirect to homepage or show message
  navigate("/");
};

// Add to render section
{onboardingState.phase1Step === "policy" && (
  <ProviderPolicyAgreement
    userId={onboardingState.userId || ""} // Will be set after signup
    onAccept={handlePolicyAccept}
    onDecline={handlePolicyDecline}
  />
)}
```

### B. Staff Onboarding

**File**: `client/pages/onboarding/StaffOnboardingFlow.tsx`

**Add as first step** before personal information:

```typescript
import { ProviderPolicyAgreement } from "@/components/onboarding/ProviderPolicyAgreement";

// Add policy step to StaffOnboardingStep type
type StaffOnboardingStep = 
  | "policy"
  | "personal_info"
  | "verification"
  | "availability"
  | "services"
  | "payment"
  | "review"
  | "complete";

// Add handler
const handlePolicyAccept = () => {
  setCurrentStep("personal_info");
  setStaffData(prev => ({ ...prev, policyAccepted: true }));
};

// Add to render
{currentStep === "policy" && (
  <ProviderPolicyAgreement
    userId={staffData.userId || ""}
    onAccept={handlePolicyAccept}
    onDecline={() => navigate("/")}
  />
)}
```

### C. Quick Sign-Up Flow (ProviderPortal.tsx)

**File**: `client/pages/ProviderPortal.tsx`

For the simplified signup flow:

```typescript
// After successful signup, before redirecting to onboarding
const handleSignup = async (formData) => {
  // ... existing signup logic ...
  
  // Redirect to policy agreement first
  navigate("/provider-onboarding/policy", {
    state: { userId: data.user.id }
  });
};

// Create new route
// In App.tsx or routes file:
<Route 
  path="/provider-onboarding/policy" 
  element={<ProviderPolicyPage />} 
/>
```

Create **`client/pages/onboarding/ProviderPolicyPage.tsx`**:

```typescript
import { useLocation, useNavigate } from "react-router-dom";
import { ProviderPolicyAgreement } from "@/components/onboarding/ProviderPolicyAgreement";

export default function ProviderPolicyPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const userId = location.state?.userId;

  if (!userId) {
    navigate("/signin");
    return null;
  }

  const handleAccept = () => {
    navigate("/provider-onboarding/phase1", {
      state: { userId, policyAccepted: true }
    });
  };

  const handleDecline = () => {
    navigate("/");
  };

  return (
    <ProviderPolicyAgreement
      userId={userId}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
}
```

## API Endpoint (Optional)

For checking if a user has accepted the policy:

**Create**: `roam-provider-app/api/onboarding/check-policy-acceptance.ts`

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { user_id } = req.query;

  if (!user_id || typeof user_id !== 'string') {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const supabase = createClient(
      process.env.VITE_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('policy_acceptances')
      .select('*')
      .eq('user_id', user_id)
      .eq('document_type', 'provider_policy')
      .order('accepted_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return res.status(200).json({
      accepted: !!data,
      acceptance: data || null
    });
  } catch (error) {
    console.error('Error checking policy acceptance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

## Usage Example

```typescript
// Check if user has accepted policy
const checkPolicyAcceptance = async (userId: string) => {
  const response = await fetch(`/api/onboarding/check-policy-acceptance?user_id=${userId}`);
  const data = await response.json();
  return data.accepted;
};

// In onboarding flow
useEffect(() => {
  const checkPolicy = async () => {
    if (user?.id) {
      const hasAccepted = await checkPolicyAcceptance(user.id);
      if (!hasAccepted) {
        setCurrentStep("policy");
      } else {
        setCurrentStep("personal_info");
      }
    }
  };
  checkPolicy();
}, [user]);
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] `policy_acceptances` table created with correct columns
- [ ] RLS policies are active
- [ ] Component renders on mobile (test at 375px width)
- [ ] Scroll progress tracking works
- [ ] All 4 checkboxes must be checked
- [ ] "Accept" button disabled until scrolled to bottom
- [ ] Download function works
- [ ] Expand/collapse sections work
- [ ] Policy acceptance saved to database
- [ ] IP address captured correctly
- [ ] User agent captured correctly
- [ ] Onboarding proceeds after acceptance
- [ ] Decline button redirects appropriately

## Mobile Responsive Features

✅ **Already implemented**:
- Responsive text sizes (`text-xs sm:text-sm md:text-lg`)
- Mobile-optimized spacing (`p-3 sm:p-6`)
- Stacked button layout on mobile (`flex-col-reverse sm:flex-row`)
- Touch-friendly checkboxes and buttons
- Adaptive scroll height (`h-[400px] sm:h-[500px]`)
- Full-width buttons on mobile (`w-full sm:w-40`)

## Admin Dashboard (Optional)

To view policy acceptances in admin app:

**Create**: `roam-admin-app/client/pages/AdminPolicyAcceptances.tsx`

```typescript
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/layout/admin-layout';
import { ROAMDataTable } from '@/components/ui/roam-data-table';

async function fetchPolicyAcceptances() {
  const response = await fetch('/api/policy-acceptances');
  return response.json();
}

export default function AdminPolicyAcceptances() {
  const { data: acceptances = [], isLoading } = useQuery({
    queryKey: ['policy-acceptances'],
    queryFn: fetchPolicyAcceptances
  });

  const columns = [
    { key: 'user_email', header: 'User Email' },
    { key: 'document_version', header: 'Version' },
    { key: 'accepted_at', header: 'Accepted Date', render: (val: string) => new Date(val).toLocaleDateString() },
    { key: 'ip_address', header: 'IP Address' },
  ];

  return (
    <AdminLayout title="Provider Policy Acceptances">
      <ROAMDataTable
        title="Policy Acceptances"
        columns={columns}
        data={acceptances}
        searchable={true}
        addable={false}
      />
    </AdminLayout>
  );
}
```

## Policy Updates

When updating the policy:

1. Update `PROVIDER_POLICY_CONTENT.version` (e.g., "1.1")
2. Update `PROVIDER_POLICY_CONTENT.lastUpdated`
3. Update specific sections as needed
4. Existing providers may need to re-accept (implement re-acceptance flow)

## Compliance Notes

✅ **Legal Requirements Met**:
- Full disclosure of terms
- Explicit consent via checkboxes
- Audit trail (IP, user agent, timestamp)
- Downloadable copy
- Version tracking
- Independent contractor disclosure
- Commission structure transparency
- Cancellation policy clarity

## Support

For questions or issues:
- **Legal Questions**: legal@roamwellness.com
- **Technical Issues**: support@roamwellness.com
- **Documentation**: This file

---

**Implementation Status**: Ready  
**Estimated Time**: 2-3 hours for full integration  
**Priority**: High (required before accepting new providers)
