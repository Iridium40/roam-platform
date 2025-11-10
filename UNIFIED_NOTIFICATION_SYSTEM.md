# 🔔 Unified Notification System - Complete Implementation Guide

## Overview

This document provides a complete architecture for implementing all email notifications across **Customer App**, **Provider App**, and **Admin App** using the same direct-send pattern.

---

## 📋 Notification Inventory

### Customer App Notifications
1. ✅ **customer_booking_accepted** - Booking confirmed (IMPLEMENTED)
2. ⏳ **customer_welcome** - New account created
3. ⏳ **customer_booking_completed** - Service finished, request review
4. ⏳ **customer_booking_reminder** - 24h before appointment

### Provider App Notifications
5. ⏳ **provider_new_booking** - New booking request received
6. ⏳ **provider_booking_cancelled** - Customer cancelled
7. ⏳ **provider_booking_rescheduled** - Customer rescheduled

### Admin App Notifications
8. ⏳ **admin_business_verification** - New business needs review

---

## 🏗️ Architecture Pattern

### ✅ Proven Pattern (Already Implemented)

```typescript
// 1. Import email service + templates
import { EmailService } from '../../server/services/emailService';
import { ROAM_EMAIL_TEMPLATES } from '../../shared/emailTemplates';

// 2. Generate email from template
const emailHtml = ROAM_EMAIL_TEMPLATES.bookingConfirmed(...params);

// 3. Send via Resend
const emailSent = await EmailService.sendEmail({
  to: customer.email,
  subject: 'Subject Line',
  html: emailHtml,
  text: plainTextVersion
});

// 4. Log result
await supabase.from('notification_logs').insert({
  user_id: userId,
  notification_type: 'customer_booking_accepted',
  channel: 'email',
  status: emailSent ? 'sent' : 'failed',
  ...
});
```

---

## 📁 File Structure per App

### Each App Should Have:

```
app-name/
├── shared/
│   └── emailTemplates.ts          # All email templates for this app
├── server/
│   └── services/
│       └── emailService.ts         # Resend email sender
└── api/
    └── [various-endpoints].ts      # Trigger emails from here
```

---

## 🎯 Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ **customer_booking_accepted** - Done!
2. **customer_welcome** - Sign up flow
3. **provider_new_booking** - Critical for providers

### Phase 2: Important (Do Next)
4. **customer_booking_completed** - Drives reviews
5. **provider_booking_cancelled** - Prevents confusion

### Phase 3: Nice-to-Have
6. **customer_booking_reminder** - Reduces no-shows
7. **provider_booking_rescheduled** - Keeps everyone informed
8. **admin_business_verification** - Internal efficiency

---

## 📝 Step-by-Step Implementation Guide

### Step 1: Create Email Templates File

**Location:** `/[app-name]/shared/emailTemplates.ts`

```typescript
// Example structure (see detailed templates below)
export const ROAM_EMAIL_TEMPLATES = {
  // Customer templates
  customerWelcome: (firstName, appUrl) => { ... },
  bookingConfirmed: (...) => { ... }, // ✅ Already done
  bookingCompleted: (...) => { ... },
  bookingReminder: (...) => { ... },
  
  // Provider templates
  newBookingRequest: (...) => { ... },
  bookingCancelled: (...) => { ... },
  bookingRescheduled: (...) => { ... },
  
  // Admin templates
  businessVerificationNeeded: (...) => { ... }
};
```

### Step 2: Add to Appropriate Endpoint

**Example: Customer Welcome Email**

```typescript
// customer-app/api/auth/signup.ts (or wherever signup happens)

import { EmailService } from '../../server/services/emailService';
import { ROAM_EMAIL_TEMPLATES } from '../../shared/emailTemplates';

// After successful signup...
try {
  const emailHtml = ROAM_EMAIL_TEMPLATES.customerWelcome(
    firstName,
    'https://roamyourbestlife.com'
  );

  await EmailService.sendEmail({
    to: email,
    subject: 'Welcome to ROAM - Your Best Life, Everywhere! 🎉',
    html: emailHtml
  });

  // Log it
  await supabase.from('notification_logs').insert({
    user_id: newUser.id,
    notification_type: 'customer_welcome',
    channel: 'email',
    status: 'sent',
    body: JSON.stringify({ firstName }),
    metadata: { email_to: email }
  });
} catch (error) {
  // Log failure but don't block signup
  console.error('Failed to send welcome email:', error);
}
```

### Step 3: Test & Monitor

```sql
-- Check if emails are being sent
SELECT 
  notification_type,
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE status = 'sent') as successful,
  COUNT(*) FILTER (WHERE status = 'failed') as failed
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY notification_type, status
ORDER BY notification_type;
```

---

## 📧 Email Template Library

### Customer App Templates

#### 1. Customer Welcome

```typescript
customerWelcome: (firstName: string, appUrl: string) => {
  const content = `
    <h1>Welcome to ROAM, ${firstName}! 🎉</h1>
    <p>We're thrilled to have you join our community!</p>
    
    <div class="info-box">
      <h3>What You Can Do:</h3>
      <ul>
        <li>Browse wellness services near you</li>
        <li>Book appointments with verified providers</li>
        <li>Manage your bookings and history</li>
        <li>Leave reviews and earn rewards</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${appUrl}/explore" class="button">Start Exploring</a>
    </div>
    
    <p>Need help getting started? Check out our <a href="${appUrl}/help">help center</a> or reply to this email.</p>
    
    <p>Welcome aboard!<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Where to add:** Customer app signup endpoint  
**Trigger:** After successful account creation  
**To:** New customer's email

---

#### 2. Booking Completed (Request Review)

```typescript
bookingCompleted: (customerName: string, serviceName: string, providerName: string, providerId: string, bookingId: string) => {
  const content = `
    <h1>Service Completed! 🎉</h1>
    <p>Hi ${customerName},</p>
    <p>Your ${serviceName} service with ${providerName} has been completed.</p>
    
    <div class="highlight">
      <h3>How was your experience?</h3>
      <p>Your feedback helps other customers and supports great providers!</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="https://roamyourbestlife.com/review/${bookingId}" class="button">Leave a Review</a>
      </div>
      
      <p style="font-size: 14px; margin-top: 15px;">
        ⭐ Rate your experience<br>
        💡 Share helpful details<br>
        💵 Add an optional tip
      </p>
    </div>
    
    <div class="info-box">
      <p style="margin: 0;"><strong>Service:</strong> ${serviceName}</p>
      <p style="margin: 10px 0 0 0;"><strong>Provider:</strong> ${providerName}</p>
    </div>
    
    <p>Thank you for choosing ROAM!<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Where to add:** Provider app booking status update endpoint  
**Trigger:** When status changes to `'completed'`  
**To:** Customer's email

---

#### 3. Booking Reminder

```typescript
bookingReminder: (customerName: string, serviceName: string, providerName: string, bookingDate: string, bookingTime: string, location: string) => {
  const content = `
    <h1>⏰ Reminder: Your Appointment is Tomorrow!</h1>
    <p>Hi ${customerName},</p>
    <p>This is a friendly reminder about your upcoming appointment.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Tomorrow's Appointment</h2>
      <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
      <p style="margin: 10px 0;"><strong>Provider:</strong> ${providerName}</p>
      <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
      <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
      <p style="margin: 10px 0;"><strong>Location:</strong> ${location}</p>
    </div>
    
    <div class="highlight">
      <h3>Before Your Appointment:</h3>
      <ul>
        <li>Arrive 5-10 minutes early</li>
        <li>Bring any required items</li>
        <li>Contact provider if you need to reschedule</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://roamyourbestlife.com/my-bookings" class="button">View Booking Details</a>
    </div>
    
    <p>See you soon!<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Where to add:** Separate cron job or scheduled function  
**Trigger:** 24 hours before booking time  
**To:** Customer's email

---

### Provider App Templates

#### 4. New Booking Request

```typescript
newBookingRequest: (providerName: string, customerName: string, serviceName: string, bookingDate: string, bookingTime: string, bookingId: string) => {
  const content = `
    <h1>🔔 New Booking Request!</h1>
    <p>Hi ${providerName},</p>
    <p>You have a new booking request from ${customerName}.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Booking Details</h2>
      <p style="margin: 10px 0;"><strong>Customer:</strong> ${customerName}</p>
      <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
      <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
      <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
    </div>
    
    <div class="highlight">
      <p><strong>⏰ Action Required:</strong> Please review and accept/decline this booking within 24 hours.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.roamprovider.com/bookings" class="button">Review Booking</a>
    </div>
    
    <p>Best regards,<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Where to add:** Customer app booking creation endpoint  
**Trigger:** When customer creates new booking  
**To:** Provider's email

---

#### 5. Booking Cancelled

```typescript
bookingCancelled: (providerName: string, customerName: string, serviceName: string, bookingDate: string, cancellationReason: string) => {
  const content = `
    <h1>❌ Booking Cancelled</h1>
    <p>Hi ${providerName},</p>
    <p>${customerName} has cancelled their booking.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Cancelled Booking</h2>
      <p style="margin: 10px 0;"><strong>Customer:</strong> ${customerName}</p>
      <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
      <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
      ${cancellationReason ? `<p style="margin: 10px 0;"><strong>Reason:</strong> ${cancellationReason}</p>` : ''}
    </div>
    
    <p>This time slot is now available for other bookings.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.roamprovider.com/bookings" class="button">View Schedule</a>
    </div>
    
    <p>Best regards,<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Where to add:** Customer app booking cancellation endpoint  
**Trigger:** When customer cancels booking  
**To:** Provider's email

---

#### 6. Booking Rescheduled

```typescript
bookingRescheduled: (providerName: string, customerName: string, serviceName: string, oldDate: string, oldTime: string, newDate: string, newTime: string) => {
  const content = `
    <h1>🔄 Booking Rescheduled</h1>
    <p>Hi ${providerName},</p>
    <p>${customerName} has rescheduled their booking.</p>
    
    <div class="info-box">
      <h3>Previous Booking:</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${oldDate}</p>
      <p style="margin: 5px 0;"><strong>Time:</strong> ${oldTime}</p>
    </div>
    
    <div class="highlight">
      <h3>New Booking:</h3>
      <p style="margin: 5px 0;"><strong>Date:</strong> ${newDate}</p>
      <p style="margin: 5px 0;"><strong>Time:</strong> ${newTime}</p>
      <p style="margin: 5px 0;"><strong>Service:</strong> ${serviceName}</p>
      <p style="margin: 5px 0;"><strong>Customer:</strong> ${customerName}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.roamprovider.com/bookings" class="button">View Updated Schedule</a>
    </div>
    
    <p>Best regards,<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Where to add:** Customer app booking reschedule endpoint  
**Trigger:** When customer reschedules booking  
**To:** Provider's email

---

### Admin App Templates

#### 7. Business Verification Needed

```typescript
businessVerificationNeeded: (businessName: string, businessId: string, submittedDate: string) => {
  const content = `
    <h1>🔔 New Business Awaiting Verification</h1>
    <p>A new business has completed their application and is ready for review.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Business Details</h2>
      <p style="margin: 10px 0;"><strong>Business Name:</strong> ${businessName}</p>
      <p style="margin: 10px 0;"><strong>Business ID:</strong> ${businessId}</p>
      <p style="margin: 10px 0;"><strong>Submitted:</strong> ${submittedDate}</p>
    </div>
    
    <div class="highlight">
      <h3>⏰ Action Required:</h3>
      <p>Please review and approve/reject this business application.</p>
      <p><strong>Tasks:</strong></p>
      <ul>
        <li>Review business documents</li>
        <li>Verify credentials</li>
        <li>Check background check results</li>
        <li>Approve or reject application</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://admin.roamyourbestlife.com/applications/${businessId}" class="button">Review Application</a>
    </div>
    
    <p>Best regards,<br><strong>ROAM Admin System</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Where to add:** Provider app application submission endpoint  
**Trigger:** When provider completes Phase 1 application  
**To:** Admin email(s)

---

## 🔧 Implementation Checklist

### For Each Notification:

- [ ] Add template to `shared/emailTemplates.ts`
- [ ] Import EmailService + templates in endpoint
- [ ] Generate email HTML
- [ ] Send via EmailService
- [ ] Log to `notification_logs`
- [ ] Handle errors gracefully
- [ ] Test with real email
- [ ] Verify in Resend dashboard
- [ ] Check notification logs

---

## 📊 Monitoring & Debugging

### Check Email Delivery Rate

```sql
-- Overall success rate
SELECT 
  notification_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  ROUND(COUNT(*) FILTER (WHERE status = 'sent')::numeric / COUNT(*) * 100, 2) as success_rate
FROM notification_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY notification_type
ORDER BY total DESC;
```

### Find Failed Emails

```sql
-- See what's failing
SELECT 
  id,
  notification_type,
  metadata->>'email_to' as email,
  metadata->>'error' as error,
  created_at
FROM notification_logs
WHERE status = 'failed'
ORDER BY created_at DESC
LIMIT 20;
```

### Resend Dashboard

- Go to https://resend.com/emails
- View all sent emails
- Check delivery status
- See open/click rates

---

## 🚀 Deployment Order

### Week 1: Critical Notifications
1. ✅ customer_booking_accepted (Done!)
2. customer_welcome
3. provider_new_booking

### Week 2: Important Notifications
4. customer_booking_completed
5. provider_booking_cancelled

### Week 3: Nice-to-Have
6. customer_booking_reminder (needs cron job)
7. provider_booking_rescheduled
8. admin_business_verification

---

## 💰 Cost Estimates

**Resend Pricing:**
- Free: 100 emails/day
- Pro: $20/month for 50,000 emails
- Scale: $80/month for 100,000 emails

**Estimated Volume:**
- 1000 bookings/day = ~3000 emails/day
- 30,000 bookings/month = ~90,000 emails/month
- **Recommendation:** Start with Pro plan ($20/month)

---

## 🎯 Next Steps

1. **Review this architecture** - Make sure it fits your needs
2. **Pick priority notifications** - Start with critical ones
3. **Implement templates** - Add to each app's emailTemplates.ts
4. **Integrate with endpoints** - Add email sending to API routes
5. **Test thoroughly** - Verify emails arrive correctly
6. **Monitor logs** - Track success/failure rates
7. **Iterate** - Add remaining notifications over time

---

**Status:** Architecture Complete, Ready to Implement  
**Pattern:** ✅ Proven (booking confirmation working)  
**Scalability:** ✅ Good for <10K emails/hour  
**Maintenance:** ✅ Simple, single codebase pattern

