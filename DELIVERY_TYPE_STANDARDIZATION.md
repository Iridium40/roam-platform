# Delivery Type Standardization Guide

## Overview

This document defines the standardized delivery types used throughout the ROAM platform for bookings, locations, and services. The system has been updated to use consistent values and labels across all interfaces.

## Delivery Type Values

### Database Values (Enum)

The following values are stored in the database:

| Value | Description |
|-------|-------------|
| `business_location` | Service provided at the business location |
| `customer_location` | Mobile service provided at customer location |
| `virtual` | Virtual/online service (remote) |
| `both_locations` | Service available at both business and customer locations |

### Display Labels

The following labels are shown to users in the application:

| Database Value | Display Label | Description |
|----------------|---------------|-------------|
| `business_location` | **Business** | Service at business location |
| `customer_location` | **Mobile** | Service at customer location |
| `virtual` | **Virtual** | Online/Remote service |
| `both_locations` | **Both** | Business or customer location |

## Implementation

### Utility Helper File

Location: `roam-provider-app/client/utils/deliveryTypeHelpers.tsx`

This file provides:
- **Type definition**: `DeliveryType` for TypeScript type safety
- **Icon helper**: `getDeliveryTypeIcon()` - Returns appropriate icon for each type
- **Label helper**: `getDeliveryTypeLabel()` - Returns display label
- **Description helper**: `getDeliveryTypeDescription()` - Returns full description
- **Options array**: `DELIVERY_TYPE_OPTIONS` - For select dropdowns

```typescript
import { getDeliveryTypeIcon, getDeliveryTypeLabel, DELIVERY_TYPE_OPTIONS } from '@/utils/deliveryTypeHelpers';

// Get icon for a delivery type
const icon = getDeliveryTypeIcon('business_location'); // Returns <Home /> icon

// Get label for display
const label = getDeliveryTypeLabel('customer_location'); // Returns "Mobile"

// Use in select dropdown
<Select>
  {DELIVERY_TYPE_OPTIONS.map(option => (
    <SelectItem key={option.value} value={option.value}>
      {option.label}
    </SelectItem>
  ))}
</Select>
```

### Icons Used

| Delivery Type | Icon | Lucide Icon Name |
|---------------|------|------------------|
| `business_location` | 🏠 | `Home` |
| `customer_location` | 📍 | `MapPin` |
| `virtual` | 🎥 | `Video` |
| `both_locations` | ⇄ | `ArrowLeftRight` |

## Updated Files

### Frontend Components

1. **ServiceListSection.tsx**
   - Updated to use `getDeliveryTypeIcon()` and `getDeliveryTypeLabel()`
   - Removed inline switch statements
   - Now displays: Business, Mobile, Virtual, Both

2. **AddServiceModal.tsx**
   - Updated delivery type select options
   - Changed labels to: Business, Mobile, Virtual, Both (Business or Mobile)
   - Added `virtual` and `both_locations` to type union

3. **BookingsTab.tsx**
   - Updated to use `getDeliveryTypeLabel()`
   - Replaced capitalize + replace logic with helper function
   - Consistent labeling across booking details

### Type Definitions

4. **types/services.ts**
   - Updated `BusinessService` interface
   - Updated `ServiceFormData` interface
   - Changed from `'mobile'` to `'virtual'` and `'both_locations'`
   - All delivery type unions now: `'business_location' | 'customer_location' | 'virtual' | 'both_locations'`

### Utility Files

5. **utils/deliveryTypeHelpers.tsx** (NEW)
   - Centralized delivery type utilities
   - Type-safe helper functions
   - Reusable across all components

## Database Schema

The `delivery_type` field is an enum in PostgreSQL:

```sql
CREATE TYPE delivery_type AS ENUM (
  'business_location',
  'customer_location',
  'virtual',
  'both_locations'
);
```

### Tables Using delivery_type

- **bookings** - Stores how the service will be delivered for each booking
- **business_services** - Defines how a business offers each service
- **service_locations** - May reference delivery preferences (if applicable)

## API Integration

### Request Format

When creating or updating services/bookings via API:

```json
{
  "service_id": "uuid",
  "business_price": 100,
  "delivery_type": "both_locations",
  "is_active": true
}
```

### Response Format

API responses include the delivery_type field:

```json
{
  "id": "uuid",
  "business_id": "uuid",
  "service_id": "uuid",
  "business_price": 100,
  "delivery_type": "both_locations",
  "is_active": true
}
```

## Business Logic

### Service Offering Rules

1. **business_location**: Service is only provided at the business address
   - Customer must come to the business
   - Requires business to have a physical location

2. **customer_location**: Mobile service at customer's location
   - Provider travels to customer
   - May have distance/travel fee considerations

3. **virtual**: Online/remote service
   - No physical location required
   - May use video conferencing, phone, etc.

4. **both_locations**: Flexible service delivery
   - Customer can choose business OR mobile
   - Provider supports both modes
   - Most flexible option for businesses

### Booking Flow

When a customer books:
1. Service's `delivery_type` determines available options
2. If `both_locations`, customer chooses preferred mode
3. Booking records the selected delivery type
4. Provider sees the delivery type in booking details

## Migration Notes

### Previous Values (Legacy)

The system previously used inconsistent values:

❌ Old values (no longer used):
- `'mobile'` - Now replaced with `'customer_location'` for consistency
- Various display labels (e.g., "Customer Location", "Business Location", "Mobile Service")

✅ New standardized values:
- Database: `business_location`, `customer_location`, `virtual`, `both_locations`
- Display: Business, Mobile, Virtual, Both

### Migration Path

If you have existing data with old values:

```sql
-- Update any legacy 'mobile' values to 'customer_location'
UPDATE business_services 
SET delivery_type = 'customer_location' 
WHERE delivery_type = 'mobile';

UPDATE bookings 
SET delivery_type = 'customer_location' 
WHERE delivery_type = 'mobile';
```

## Usage Examples

### In a Component

```tsx
import { getDeliveryTypeIcon, getDeliveryTypeLabel } from '@/utils/deliveryTypeHelpers';

function ServiceCard({ service }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {getDeliveryTypeIcon(service.delivery_type)}
        <span>{getDeliveryTypeLabel(service.delivery_type)}</span>
      </div>
    </div>
  );
}
```

### In a Select Dropdown

```tsx
import { DELIVERY_TYPE_OPTIONS } from '@/utils/deliveryTypeHelpers';

function DeliveryTypeSelect({ value, onChange }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="Select delivery type" />
      </SelectTrigger>
      <SelectContent>
        {DELIVERY_TYPE_OPTIONS.map(option => (
          <SelectItem key={option.value} value={option.value}>
            <div className="flex items-center gap-2">
              <option.icon className="h-4 w-4" />
              <span>{option.label}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

### In API Handlers

```typescript
// roam-provider-app/api/business/services.ts
const { delivery_type = 'customer_location' } = req.body;

// Validate delivery type
const validTypes = ['business_location', 'customer_location', 'virtual', 'both_locations'];
if (!validTypes.includes(delivery_type)) {
  return res.status(400).json({ error: 'Invalid delivery type' });
}
```

## Best Practices

1. **Always use helper functions** - Don't implement custom label/icon logic
2. **Import from central location** - Use `@/utils/deliveryTypeHelpers`
3. **Type safety** - Use the `DeliveryType` type for all delivery type variables
4. **Consistency** - Always use the same labels across the application
5. **Accessibility** - Include descriptive text with icons

## Testing

### Manual Testing Checklist

- [ ] Service creation shows correct delivery type options
- [ ] Service list displays correct labels and icons
- [ ] Booking details show correct delivery type
- [ ] API accepts all four delivery types
- [ ] Icons render correctly in all views
- [ ] Labels are consistently "Business", "Mobile", "Virtual", "Both"

### Test Cases

```typescript
describe('Delivery Type Helpers', () => {
  it('should return correct label for business_location', () => {
    expect(getDeliveryTypeLabel('business_location')).toBe('Business');
  });

  it('should return correct label for customer_location', () => {
    expect(getDeliveryTypeLabel('customer_location')).toBe('Mobile');
  });

  it('should return correct label for virtual', () => {
    expect(getDeliveryTypeLabel('virtual')).toBe('Virtual');
  });

  it('should return correct label for both_locations', () => {
    expect(getDeliveryTypeLabel('both_locations')).toBe('Both');
  });
});
```

## Troubleshooting

### Issue: Labels showing old format

**Problem**: Labels still show "Customer Location" instead of "Mobile"

**Solution**: 
1. Check if component is importing helpers
2. Verify helper function is being used
3. Clear build cache and rebuild

### Issue: TypeScript errors on delivery_type

**Problem**: Type errors when using new delivery types

**Solution**:
1. Update `types/services.ts` with new type union
2. Replace `'mobile'` with `'customer_location'`, `'virtual'`, `'both_locations'`
3. Rebuild TypeScript

### Issue: API validation fails

**Problem**: API rejects new delivery types

**Solution**:
1. Update API validation to accept new types
2. Check database enum includes all types
3. Verify migration was run

## Future Enhancements

Potential future additions:

- [ ] Distance-based pricing for mobile services
- [ ] Service radius configuration for mobile services
- [ ] Virtual service platform integration (Zoom, Teams, etc.)
- [ ] Hybrid delivery type (e.g., consultation virtual, service in-person)
- [ ] Delivery type filtering in search
- [ ] Delivery type analytics and reporting

## Support

For questions or issues related to delivery types:

1. Check this documentation first
2. Review helper function implementation
3. Verify database enum values
4. Check API validation logic
5. Test with sample data

## Changelog

### January 2025 - Initial Standardization
- Created central utility helpers
- Updated all components to use consistent labels
- Changed from "Customer Location" → "Mobile"
- Changed from "Business Location" → "Business"
- Added "Virtual" and "Both" options
- Removed legacy "mobile" value
- Created comprehensive documentation
