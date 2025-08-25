# Notification & SMS Service Migration Guide

## 🎯 Overview

This guide explains how to migrate from the separate notification implementations in the customer, provider, and admin apps to a unified shared notification service that consolidates Resend for emails and Twilio for SMS.

## 📊 Current State Analysis

### ✅ **Provider App (Comprehensive Implementation)**
- **Resend email service** with comprehensive templates
- **Email templates** for welcome, onboarding, application status
- **Twilio SMS integration** for booking notifications
- **Notification edge function** for real-time updates

### ✅ **Customer App (Similar Implementation)**
- **Resend email service** (duplicate of provider)
- **Twilio SMS integration** for booking notifications
- **Notification edge function** for real-time updates
- **Booking status notifications** via Twilio conversations

### ❌ **Admin App (Minimal Implementation)**
- **Basic notification handling**
- **No dedicated email/SMS services**

## 🚀 Migration Strategy

### Phase 1: Create Shared Notification Service (✅ Complete)

We've created a unified notification service in `packages/shared/src/services/notification-service.ts` that:

- **Consolidates Resend email** functionality from all apps
- **Integrates Twilio SMS** for notifications
- **Provides comprehensive templates** for all notification types
- **Supports multiple channels** (email, SMS, push)
- **Maintains type safety** with comprehensive TypeScript types

### Phase 2: Update Apps to Use Shared Service

#### Step 1: Update Provider App

1. **Replace the existing email service**:

```typescript
// Before: roam-provider-app/server/services/emailService.ts
// ... 344 lines of custom implementation

// After: roam-provider-app/api/notifications/index.ts
import { createNotificationAPI } from '@roam/shared/services';

const api = createNotificationAPI();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
```

2. **Update booking status notifications**:

```typescript
// Before: roam-provider-app/api/bookings/status-update.ts
// ... manual notification logic

// After: roam-provider-app/api/bookings/status-update.ts
import { createNotificationService } from '@roam/shared/services';

const notificationService = createNotificationService();

// Replace manual notification logic with:
const notificationResults = await notificationService.sendBookingStatusUpdate(
  booking,
  newStatus,
  notifyCustomer,
  notifyProvider
);
```

#### Step 2: Update Customer App

1. **Replace the existing email service**:

```typescript
// Before: roam-customer-app/server/services/emailService.ts
// ... duplicate implementation

// After: roam-customer-app/api/notifications/index.ts
import { createNotificationAPI } from '@roam/shared/services';

const api = createNotificationAPI();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
```

2. **Update booking status notifications**:

```typescript
// Before: roam-customer-app/api/bookings/status-update.ts
// ... manual notification logic

// After: roam-customer-app/api/bookings/status-update.ts
import { createNotificationService } from '@roam/shared/services';

const notificationService = createNotificationService();

// Replace manual notification logic with:
const notificationResults = await notificationService.sendBookingStatusUpdate(
  booking,
  newStatus,
  notifyCustomer,
  notifyProvider
);
```

#### Step 3: Update Admin App

1. **Create notification API endpoint**:

```typescript
// roam-admin-app/api/notifications/index.ts
import { createNotificationAPI } from '@roam/shared/services';

const api = createNotificationAPI();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  return api.handleRequest(req, res);
}
```

## 🔧 Implementation Details

### Shared Service Features

#### **Email Notifications (Resend)**
- ✅ **Welcome emails** - Customer, provider, admin specific
- ✅ **Password reset emails** - Secure token-based reset
- ✅ **Booking status updates** - Real-time status changes
- ✅ **Application notifications** - Provider onboarding
- ✅ **Custom templates** - Branded ROAM templates

#### **SMS Notifications (Twilio)**
- ✅ **Booking confirmations** - Status updates via SMS
- ✅ **Appointment reminders** - Automated reminders
- ✅ **Emergency notifications** - Critical updates
- ✅ **Conversation notifications** - Twilio chat integration

#### **Multi-Channel Support**
- ✅ **Email** - Primary communication channel
- ✅ **SMS** - Real-time notifications
- ✅ **Push notifications** - Future implementation ready
- ✅ **In-app notifications** - Real-time updates

### API Usage Examples

#### **Send Welcome Email**
```typescript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send_welcome_email',
    email: 'user@example.com',
    firstName: 'John',
    userType: 'customer'
  })
});
```

#### **Send SMS Notification**
```typescript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send_sms',
    to: '+1234567890',
    message: 'Your booking has been confirmed!'
  })
});
```

#### **Send Booking Status Update**
```typescript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send_booking_status_update',
    booking: {
      id: 'booking-123',
      customer_id: 'customer-456',
      provider_id: 'provider-789',
      service_name: 'Massage Therapy'
    },
    newStatus: 'confirmed',
    notifyCustomer: true,
    notifyProvider: true
  })
});
```

#### **Send Multi-Channel Notification**
```typescript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send_notification',
    type: 'all',
    to: 'user@example.com',
    subject: 'Important Update',
    message: 'Your account has been updated',
    channels: ['email', 'sms'],
    userId: 'user-123',
    userType: 'customer',
    priority: 'high'
  })
});
```

#### **Send Password Reset Email**
```typescript
const response = await fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'send_password_reset',
    email: 'user@example.com',
    resetToken: 'reset-token-123'
  })
});
```

## 📋 Migration Checklist

### For Provider App
- [ ] Update `package.json` to include `@roam/shared` dependency
- [ ] Replace existing email service with shared notification API
- [ ] Update booking status update logic to use shared service
- [ ] Test all existing email functionality
- [ ] Remove old email service files (after testing)

### For Customer App
- [ ] Update `package.json` to include `@roam/shared` dependency
- [ ] Replace existing email service with shared notification API
- [ ] Update booking status update logic to use shared service
- [ ] Test all existing email functionality
- [ ] Remove old email service files (after testing)

### For Admin App
- [ ] Update `package.json` to include `@roam/shared` dependency
- [ ] Create new notification API endpoint using shared service
- [ ] Test notification functionality
- [ ] Update any existing notification calls

### Shared Tasks
- [ ] Update environment variables to use shared configuration
- [ ] Test cross-app notification delivery
- [ ] Verify email templates still work correctly
- [ ] Test SMS delivery via Twilio
- [ ] Update documentation

## 🧪 Testing Strategy

### Unit Tests
```typescript
// Test the shared notification service
import { createNotificationService } from '@roam/shared/services';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    service = createNotificationService();
  });

  test('should send welcome email correctly', async () => {
    const result = await service.sendWelcomeEmail(
      'test@example.com',
      'John',
      'customer'
    );

    expect(result.success).toBe(true);
    expect(result.channel).toBe('email');
  });

  test('should send SMS notification correctly', async () => {
    const result = await service.sendSMS(
      '+1234567890',
      'Test SMS message'
    );

    expect(result.success).toBe(true);
    expect(result.channel).toBe('sms');
  });

  test('should handle booking status updates', async () => {
    const booking = {
      id: 'booking-123',
      customer_id: 'customer-456',
      provider_id: 'provider-789',
      service_name: 'Test Service'
    };

    const results = await service.sendBookingStatusUpdate(
      booking,
      'confirmed',
      true,
      true
    );

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.success)).toBe(true);
  });
});
```

### Integration Tests
```typescript
// Test the notification API endpoint
describe('Notification API', () => {
  test('should handle welcome email request', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .send({
        action: 'send_welcome_email',
        email: 'test@example.com',
        firstName: 'John',
        userType: 'customer'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('should handle SMS request', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .send({
        action: 'send_sms',
        to: '+1234567890',
        message: 'Test SMS'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('should handle booking status update', async () => {
    const response = await request(app)
      .post('/api/notifications')
      .send({
        action: 'send_booking_status_update',
        booking: {
          id: 'booking-123',
          customer_id: 'customer-456',
          provider_id: 'provider-789',
          service_name: 'Test Service'
        },
        newStatus: 'confirmed'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

## 🚀 Benefits After Migration

### **Code Quality**
- ✅ **Single source of truth** for notification logic
- ✅ **Consistent templates** across all apps
- ✅ **Type safety** with comprehensive TypeScript types
- ✅ **Better error handling** with specific error codes

### **Maintainability**
- ✅ **Easier updates** - change once, affects all apps
- ✅ **Reduced duplication** - no more maintaining three implementations
- ✅ **Better documentation** - shared interfaces and examples
- ✅ **Consistent behavior** - same logic for all notification types

### **Developer Experience**
- ✅ **Faster development** - reuse existing functionality
- ✅ **Better debugging** - centralized logging and error handling
- ✅ **Easier onboarding** - single implementation to learn
- ✅ **Consistent API** - same endpoints across all apps

### **Cost Efficiency**
- ✅ **Reduced API calls** - optimized notification delivery
- ✅ **Better template management** - centralized template updates
- ✅ **Improved deliverability** - consistent sender reputation
- ✅ **Easier monitoring** - centralized notification tracking

## 🆘 Troubleshooting

### Common Issues

1. **Environment Variables Not Found**
   ```bash
   # Ensure these are set in all apps
   RESEND_API_KEY=your_resend_api_key
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_FROM_NUMBER=your_twilio_phone_number
   ```

2. **Shared Package Not Found**
   ```bash
   # Build shared packages first
   cd packages/shared && npm run build
   
   # Install dependencies in app
   cd apps/roam-provider-app && npm install
   ```

3. **Template Rendering Errors**
   ```bash
   # Check template syntax
   npm run test:notifications
   
   # Ensure all required template variables are provided
   ```

### Debug Commands

```bash
# Test shared notification service locally
cd packages/shared && npm run test

# Test notification API endpoint
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"action":"send_welcome_email","email":"test@example.com","firstName":"John","userType":"customer"}'

# Check notification logs
vercel logs --follow
```

## 📈 Next Steps

After successful migration:

1. **Monitor notification delivery** - track email/SMS success rates
2. **Gather feedback** - collect user feedback on notification experience
3. **Implement additional features** - push notifications, webhooks
4. **Optimize performance** - implement caching, rate limiting
5. **Scale** - prepare for increased notification volume

## 🎯 API Reference

### Available Actions

| Action | Description | Required Fields |
|--------|-------------|-----------------|
| `send_notification` | Send multi-channel notification | `to`, `message` |
| `send_email` | Send email only | `to`, `subject`, `html` |
| `send_sms` | Send SMS only | `to`, `message` |
| `send_push` | Send push notification | `userId`, `title`, `body` |
| `send_booking_notification` | Send booking-specific notification | `bookingId`, `type`, `userId`, `userType` |
| `send_welcome_email` | Send welcome email | `email`, `firstName`, `userType` |
| `send_password_reset` | Send password reset email | `email`, `resetToken` |
| `send_booking_status_update` | Send booking status update | `booking`, `newStatus` |

### Response Format

```typescript
{
  success: boolean;
  results?: NotificationResult[];
  result?: NotificationResult;
  message: string;
  error?: string;
}
```

### NotificationResult Format

```typescript
{
  success: boolean;
  messageId?: string;
  error?: string;
  channel: 'email' | 'sms' | 'push';
}
```

---

**Remember**: The goal is to have a single, robust notification system that works seamlessly across all three apps while maintaining the independence of each app's deployment and providing a consistent user experience with Resend for emails and Twilio for SMS.
