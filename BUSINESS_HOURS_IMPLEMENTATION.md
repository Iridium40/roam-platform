# Business Hours Implementation Guide

## Overview

The business hours feature allows businesses to set their operating hours for each day of the week. The implementation handles format conversion between the database storage format (capitalized day names) and the frontend format (lowercase day names).

## Architecture

### Database Schema

Business hours are stored in the `business_profiles` table as a JSONB field:

```sql
-- Column: business_hours (JSONB)
-- Format: { "Monday": { "open": "09:00", "close": "17:00" } }
```

**Key points:**
- Days are capitalized (Monday, Tuesday, etc.)
- Only **open days** are stored (closed days are omitted)
- Times are in 24-hour format (HH:MM)
- No explicit `closed` field in database

### API Endpoint

**Location:** `/api/business/hours`

**Methods:**
- `GET` - Fetch business hours
- `PUT` - Update business hours

### Frontend Format

The frontend uses a different format for easier state management:

```typescript
{
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  // ... etc
}
```

**Key points:**
- Days are lowercase (monday, tuesday, etc.)
- Includes explicit `closed` field for UI state
- All 7 days are always present

## Format Conversion

### Database → Frontend (transformDbToFrontend)

1. Start with default hours for all 7 days
2. Convert capitalized day names to lowercase
3. Add `closed: false` for days present in database
4. Days not in database retain `closed: true` from defaults

### Frontend → Database (transformFrontendToDb)

1. Iterate through frontend hours object
2. Capitalize first letter of day name
3. Only include days where `closed: false`
4. Omit `closed` field from database format

## API Usage

### GET Business Hours

```typescript
const response = await fetch(`/api/business/hours?business_id=${businessId}`);
const data = await response.json();

// Response format:
{
  business_id: "uuid",
  business_name: "Business Name",
  business_hours: {
    monday: { open: "09:00", close: "17:00", closed: false },
    // ... etc
  }
}
```

### PUT Business Hours

```typescript
const response = await fetch('/api/business/hours', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    business_id: businessId,
    business_hours: {
      monday: { open: "08:00", close: "18:00", closed: false },
      tuesday: { open: "08:00", close: "18:00", closed: false },
      // ... etc
    }
  })
});

const data = await response.json();
```

## Frontend Integration

### useBusinessSettings Hook

The `useBusinessSettings` hook manages business hours state:

```typescript
const {
  businessData,
  setBusinessData,
  loadBusinessHours,
  saveBusinessSettings
} = useBusinessSettings(business);

// Access hours
const hours = businessData.business_hours;

// Update hours
setBusinessData(prev => ({
  ...prev,
  business_hours: {
    ...prev.business_hours,
    monday: { open: "08:00", close: "18:00", closed: false }
  }
}));

// Save changes
await saveBusinessSettings();
```

### BusinessHoursSection Component

The UI component for editing hours:

```typescript
<BusinessHoursSection
  businessData={businessData}
  setBusinessData={setBusinessData}
  isEditing={isEditing}
/>
```

**Features:**
- Edit open/close times for each day
- Toggle closed state for each day
- Visual formatting (12-hour display)
- Validation feedback

## Data Flow

### Loading Hours

1. Component mounts → `useBusinessSettings` hook initializes
2. Hook calls `loadBusinessHours()` 
3. API GET request to `/api/business/hours`
4. API transforms database format → frontend format
5. State updated with formatted hours

### Saving Hours

1. User edits hours in `BusinessHoursSection`
2. State updated via `setBusinessData`
3. User saves → `saveBusinessSettings()` called
4. Hook makes PUT request to `/api/business/hours`
5. API transforms frontend format → database format
6. Database updated with capitalized day names
7. Success toast displayed

## Testing

Use the provided test script to verify the API:

```bash
# 1. Get a real business ID from database
psql -c "SELECT id FROM business_profiles LIMIT 1;"

# 2. Update TEST_BUSINESS_ID in test-business-hours.js

# 3. Run test suite
node test-business-hours.js
```

**Test coverage:**
- GET request and format conversion
- PUT request and format conversion
- Round-trip verification (update → fetch)

## Error Handling

### API Errors

The API returns appropriate status codes:

- `400` - Invalid parameters (missing business_id, invalid hours object)
- `404` - Business not found
- `405` - Method not allowed
- `500` - Server error

### Frontend Errors

The hook displays toast notifications for:

- Profile update failures
- Hours update failures
- Network errors

## Default Hours

If no hours are stored in database, defaults are used:

```typescript
{
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "09:00", close: "17:00", closed: false },
  sunday: { open: "09:00", close: "17:00", closed: true }, // Closed
}
```

## Best Practices

1. **Always use the API endpoint** - Don't update business_hours directly via Supabase client
2. **Preserve format consistency** - Let the API handle format conversion
3. **Validate times** - Ensure close time is after open time on frontend
4. **Handle closed days** - Don't send invalid times for closed days
5. **Test round-trips** - Verify data integrity after save → load cycle

## Future Enhancements

Potential improvements:

- [ ] Support for split shifts (lunch breaks)
- [ ] Support for special hours (holidays)
- [ ] Timezone handling
- [ ] Recurring schedule patterns
- [ ] Hours override for specific dates
- [ ] Business hours history/audit trail

## Troubleshooting

### Hours not loading

1. Check business_hours field exists in business_profiles table
2. Verify API endpoint is accessible (check network tab)
3. Check console for API errors
4. Verify business ID is correct

### Hours not saving

1. Check business profile update succeeds first
2. Verify hours API PUT request completes
3. Check database JSONB format is correct
4. Verify no validation errors in API logs

### Format issues

1. Database should have capitalized days (Monday, Tuesday)
2. Frontend should have lowercase days (monday, tuesday)
3. API handles all conversion automatically
4. Don't manually convert formats in components
