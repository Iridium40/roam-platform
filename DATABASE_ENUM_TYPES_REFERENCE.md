# Database Enum Types Reference

**Date**: October 6, 2025  
**Status**: ✅ COMPLETE & DOCUMENTED

## Overview

Comprehensive reference for all PostgreSQL enum types used in the ROAM Platform database. These types ensure data consistency and type safety across the platform.

---

## 📋 Announcement Types

### `announcement_audience`
**Purpose**: Target audience for system announcements

```typescript
type AnnouncementAudience = 'all' | 'customer' | 'provider' | 'business' | 'staff';
```

| Value | Description |
|-------|-------------|
| `all` | Broadcast to all users |
| `customer` | Only customers |
| `provider` | Only service providers |
| `business` | Only business owners |
| `staff` | Only staff members (dispatchers, internal team) |

**Usage**: `announcements.audience`

---

### `announcement_type`
**Purpose**: Categorize announcement content

```typescript
type AnnouncementType = 'general' | 'promotional' | 'maintenance' | 'feature' | 'alert' | 'news' | 'update';
```

| Value | Description | Priority |
|-------|-------------|----------|
| `general` | General information | Normal |
| `promotional` | Marketing and promotions | Low |
| `maintenance` | System maintenance notices | High |
| `feature` | New feature announcements | Normal |
| `alert` | Important alerts/warnings | Critical |
| `news` | Platform news | Normal |
| `update` | System updates | Normal |

**Usage**: `announcements.type`

---

## 💰 Payment & Transaction Types

### `payment_status`
**Purpose**: Track payment state in bookings

```typescript
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded' | 'failed';
```

| Value | Description | Next States |
|-------|-------------|-------------|
| `pending` | Payment not yet processed | `paid`, `failed` |
| `partial` | Partially paid (deposits) | `paid`, `refunded` |
| `paid` | Fully paid | `refunded` |
| `refunded` | Payment refunded | - |
| `failed` | Payment failed | `pending` |

**Usage**: `bookings.payment_status`

---

### `transaction_type`
**Purpose**: Categorize financial transactions

```typescript
type TransactionType = 'booking_payment' | 'platform_fee' | 'provider_payout' | 'refund' | 'adjustment' | 'tip';
```

| Value | Description | Flow Direction |
|-------|-------------|----------------|
| `booking_payment` | Customer pays for booking | Customer → Platform |
| `platform_fee` | Platform service fee | Platform keeps |
| `provider_payout` | Payment to provider | Platform → Provider |
| `refund` | Money returned to customer | Platform → Customer |
| `adjustment` | Manual correction | Admin action |
| `tip` | Gratuity for provider | Customer → Provider |

**Usage**: `financial_transactions.transaction_type`, `payment_transactions.transaction_type`

---

### `transaction_status`
**Purpose**: Track transaction processing state

```typescript
type TransactionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';
```

| Value | Description | Reversible |
|-------|-------------|-----------|
| `pending` | Awaiting processing | Yes |
| `completed` | Successfully processed | Via refund only |
| `failed` | Processing failed | Yes (retry) |
| `cancelled` | Transaction cancelled | No |

**Usage**: `financial_transactions.transaction_status`

---

### `status`
**Purpose**: Generic status field for various entities

```typescript
type Status = 'pending' | 'completed' | 'failed' | 'cancelled';
```

**Usage**: Multiple tables with generic status tracking

---

## 📅 Booking Types

### `booking_status`
**Purpose**: Track booking lifecycle

```typescript
type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'declined';
```

| Value | Description | Can Transition To |
|-------|-------------|-------------------|
| `pending` | Awaiting confirmation | `confirmed`, `declined`, `cancelled` |
| `confirmed` | Provider accepted | `in_progress`, `cancelled`, `no_show` |
| `in_progress` | Service being delivered | `completed`, `cancelled` |
| `completed` | Service finished | - |
| `cancelled` | Booking cancelled | - |
| `no_show` | Customer didn't show | - |
| `declined` | Provider declined | - |

**Usage**: `bookings.status`

**Business Logic**:
- Only `pending` bookings can be `declined`
- `confirmed` bookings can become `no_show` if customer doesn't appear
- `cancelled` can happen at any stage before `completed`
- `completed` is terminal - no further transitions

---

## 👥 User & Provider Types

### `user_role_type`
**Purpose**: Define user roles across the platform

```typescript
type UserRoleType = 'admin' | 'owner' | 'dispatcher' | 'provider' | 'customer';
```

| Value | Description | Access Level |
|-------|-------------|--------------|
| `admin` | Platform administrator | Full platform access |
| `owner` | Business owner | Business management |
| `dispatcher` | Schedule manager | Booking management |
| `provider` | Service provider | Service delivery |
| `customer` | End user | Booking services |

**Usage**: `user_roles.role`

---

### `provider_role`
**Purpose**: Specific roles within provider context

```typescript
type ProviderRole = 'provider' | 'owner' | 'dispatcher';
```

| Value | Description | Responsibilities |
|-------|-------------|------------------|
| `provider` | Service provider | Deliver services, manage availability |
| `owner` | Business owner | Full business control, staff management |
| `dispatcher` | Coordinator | Manage bookings, assign providers |

**Usage**: `providers.provider_role`

---

### `provider_verification_status`
**Purpose**: Track provider verification progress

```typescript
type ProviderVerificationStatus = 'pending' | 'documents_submitted' | 'under_review' | 'approved' | 'rejected';
```

| Value | Description | Next Action |
|-------|-------------|-------------|
| `pending` | Initial state | Provider submits documents |
| `documents_submitted` | Docs received | Admin reviews |
| `under_review` | Being reviewed | Admin decision |
| `approved` | Verification passed | Provider can work |
| `rejected` | Verification failed | Re-submit or appeal |

**Usage**: `providers.verification_status`

---

### `background_check_status`
**Purpose**: Track background check state

```typescript
type BackgroundCheckStatus = 'under_review' | 'pending' | 'approved' | 'rejected' | 'expired';
```

| Value | Description | Validity |
|-------|-------------|----------|
| `pending` | Not yet started | - |
| `under_review` | Check in progress | - |
| `approved` | Check passed | 1-2 years |
| `rejected` | Check failed | Permanent |
| `expired` | Approval expired | Needs renewal |

**Usage**: `providers.background_check_status`

---

## 🏢 Business Types

### `business_type`
**Purpose**: Categorize business size/structure

```typescript
type BusinessType = 'independent' | 'small_business' | 'franchise' | 'enterprise' | 'other';
```

| Value | Description | Typical Size |
|-------|-------------|--------------|
| `independent` | Solo practitioner | 1 provider |
| `small_business` | Small team | 2-10 providers |
| `franchise` | Franchise location | 5-50 providers |
| `enterprise` | Large organization | 50+ providers |
| `other` | Doesn't fit above | Varies |

**Usage**: `business_profiles.business_type`

---

### `business_document_status`
**Purpose**: Track document verification

```typescript
type BusinessDocumentStatus = 'pending' | 'verified' | 'rejected' | 'under_review';
```

| Value | Description | Action Required |
|-------|-------------|-----------------|
| `pending` | Awaiting upload | Business uploads |
| `under_review` | Being verified | Admin reviews |
| `verified` | Approved | None |
| `rejected` | Not accepted | Re-upload |

**Usage**: `business_documents.status`

---

### `business_document_type`
**Purpose**: Categorize required documents

```typescript
type BusinessDocumentType = 
  | 'drivers_license'
  | 'proof_of_address'
  | 'liability_insurance'
  | 'professional_license'
  | 'professional_certificate'
  | 'business_license';
```

| Value | Description | Required For |
|-------|-------------|--------------|
| `drivers_license` | Government ID | Identity verification |
| `proof_of_address` | Address verification | Location confirmation |
| `liability_insurance` | Insurance policy | Risk management |
| `professional_license` | State/professional license | Regulated services |
| `professional_certificate` | Training certificates | Skill verification |
| `business_license` | Business registration | Legal compliance |

**Usage**: `business_documents.document_type`

---

## 📍 Location Types

### `customer_location_type`
**Purpose**: Categorize service delivery locations

```typescript
type CustomerLocationType = 'Home' | 'Condo' | 'Hotel' | 'Other' | null;
```

| Value | Description | Access Considerations |
|-------|-------------|----------------------|
| `Home` | Single-family home | Standard access |
| `Condo` | Condominium/apartment | May need gate code |
| `Hotel` | Hotel/resort | Room number required |
| `Other` | Different location type | Special instructions |
| `null` | Not specified | - |

**Usage**: `customer_locations.location_type`

**Note**: Values use Title Case (capital first letter) to match UI display.

---

## 🎁 Promotion Types

### `promotion_savings_type`
**Purpose**: Define discount calculation method

```typescript
type PromotionSavingsType = 'percentage_off' | 'fixed_amount';
```

| Value | Description | Example |
|-------|-------------|---------|
| `percentage_off` | Percentage discount | 20% off |
| `fixed_amount` | Dollar amount off | $10 off |

**Usage**: `promotions.savings_type`

**Calculation**:
- `percentage_off`: `discount = price * (savings_value / 100)`
- `fixed_amount`: `discount = savings_value`

---

## 🔐 Verification & MFA Types

### `verification_status`
**Purpose**: Track verification state for various entities

```typescript
type VerificationStatus = 'pending' | 'approved' | 'rejected' | 'suspended';
```

| Value | Description | Reversible |
|-------|-------------|-----------|
| `pending` | Awaiting verification | Yes |
| `approved` | Verified and active | Yes (can suspend) |
| `rejected` | Verification denied | Yes (can reapply) |
| `suspended` | Temporarily disabled | Yes (can reactivate) |

**Usage**: Multiple tables for verification workflows

---

### `mfa_method_type`
**Purpose**: Define multi-factor authentication methods

```typescript
type MfaMethodType = 'totp' | 'sms' | 'email' | 'backup';
```

| Value | Description | Security Level |
|-------|-------------|----------------|
| `totp` | Time-based OTP (authenticator app) | High |
| `sms` | SMS text message | Medium |
| `email` | Email verification | Low |
| `backup` | Backup codes | Recovery only |

**Usage**: `mfa_sessions.method_type`, MFA configuration

---

### `mfa_status_type`
**Purpose**: Track MFA session/configuration status

```typescript
type MfaStatusType = 'pending' | 'active' | 'disabled' | 'locked';
```

| Value | Description | User Action |
|-------|-------------|-------------|
| `pending` | Setup not complete | Complete MFA setup |
| `active` | MFA enabled and working | None |
| `disabled` | MFA turned off | Enable MFA |
| `locked` | Too many failed attempts | Contact support |

**Usage**: `mfa_sessions.status`

---

## 📊 Implementation Guidelines

### Type Safety

All enum types are defined in TypeScript and enforced at:
1. **Database level**: PostgreSQL ENUM types
2. **API level**: Request validation
3. **Frontend level**: TypeScript types
4. **Shared package**: `@roam/shared` types

### Adding New Values

To add a new enum value:

1. **Update PostgreSQL**:
```sql
ALTER TYPE enum_name ADD VALUE 'new_value';
```

2. **Update TypeScript** (`packages/shared/src/types/database/enums.ts`):
```typescript
export type EnumName = 'existing' | 'new_value';
```

3. **Rebuild shared package**:
```bash
cd packages/shared && npm run build
```

4. **Update documentation**: This file!

### Best Practices

1. **Never delete enum values**: Can break existing data
2. **Add new values to end**: Maintains compatibility
3. **Use lowercase_snake_case**: Except CustomerLocationType (legacy)
4. **Document transitions**: Clarify valid state changes
5. **Consider business logic**: Some transitions may require special handling

---

## 🔍 Quick Reference

### Critical Status Flows

**Booking Lifecycle**:
```
pending → confirmed → in_progress → completed
   ↓         ↓            ↓
declined  cancelled   cancelled
   ↓         ↓
(end)     (end)
```

**Payment Flow**:
```
pending → paid → refunded
   ↓        ↑
failed → pending (retry)
```

**Provider Verification**:
```
pending → documents_submitted → under_review → approved
                                      ↓
                                   rejected
```

---

## 📁 File Locations

- **Enum Definitions**: `/packages/shared/src/types/database/enums.ts`
- **Table Types**: `/packages/shared/src/types/database/tables/*.ts`
- **Database Schema**: `/DATABASE_SCHEMA_REFERENCE.md`
- **This Reference**: `/DATABASE_ENUM_TYPES_REFERENCE.md`

---

## ✅ Verification Checklist

- [x] All database enum types documented
- [x] TypeScript types match database
- [x] Shared package built successfully
- [x] Enum values match database exactly
- [x] Case sensitivity documented
- [x] Transition flows documented
- [x] Usage locations specified
- [x] Examples provided

---

**Last Updated**: October 6, 2025  
**Maintained By**: ROAM Platform Team

For questions or updates, refer to the database schema documentation and codebase.
