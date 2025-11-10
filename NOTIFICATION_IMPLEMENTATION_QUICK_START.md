# ⚡ Notification Implementation - Quick Start Guide

## 🎯 Quick Reference: What Goes Where

| Notification | App | Trigger File | Template File |
|--------------|-----|--------------|---------------|
| ✅ booking_accepted | Provider | api/bookings/status-update.ts | shared/emailTemplates.ts |
| customer_welcome | Customer | api/auth/signup.ts | shared/emailTemplates.ts |
| customer_booking_completed | Provider | api/bookings/status-update.ts | shared/emailTemplates.ts |
| customer_booking_reminder | Customer | api/cron/reminders.ts (new) | shared/emailTemplates.ts |
| provider_new_booking | Customer | api/bookings/create.ts | shared/emailTemplates.ts |
| provider_booking_cancelled | Customer | api/bookings/cancel.ts | shared/emailTemplates.ts |
| provider_booking_rescheduled | Customer | api/bookings/reschedule.ts | shared/emailTemplates.ts |
| admin_business_verification | Provider | api/onboarding/submit-application.ts | shared/emailTemplates.ts |

---

## 📝 Copy-Paste Templates

### 1. Customer Welcome Email

**Add to:** `/roam-customer-app/shared/emailTemplates.ts`

```typescript
// Add this to ROAM_EMAIL_TEMPLATES object
customerWelcome: (firstName: string) => {
  const content = `
    <h1>Welcome to ROAM, ${firstName}! 🎉</h1>
    <p>We're thrilled to have you join our community of wellness enthusiasts!</p>
    
    <div class="info-box">
      <h3>What You Can Do on ROAM:</h3>
      <ul style="margin: 10px 0;">
        <li>🔍 Browse wellness services in your area</li>
        <li>📅 Book appointments with verified providers</li>
        <li>💬 Message providers directly</li>
        <li>⭐ Leave reviews and earn rewards</li>
        <li>🎁 Get exclusive deals and promotions</li>
      </ul>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://roamyourbestlife.com/explore" class="button">Start Exploring Services</a>
    </div>
    
    <div class="highlight">
      <h3>New to ROAM?</h3>
      <p>Check out our <a href="https://roamyourbestlife.com/help">help center</a> for tips on finding the perfect service provider.</p>
    </div>
    
    <p>Welcome aboard!<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Add to:** Signup endpoint (find where customer accounts are created)

```typescript
// After successful customer creation
try {
  const emailHtml = ROAM_EMAIL_TEMPLATES.customerWelcome(firstName);

  const emailSent = await EmailService.sendEmail({
    to: email,
    subject: 'Welcome to ROAM - Your Best Life, Everywhere! 🎉',
    html: emailHtml
  });

  await supabase.from('notification_logs').insert({
    user_id: newUser.id,
    notification_type: 'customer_welcome',
    channel: 'email',
    status: emailSent ? 'sent' : 'failed',
    body: JSON.stringify({ firstName }),
    metadata: { email_to: email, sent_at: new Date().toISOString() }
  });
} catch (error) {
  console.error('⚠️ Failed to send welcome email (non-fatal):', error);
}
```

---

### 2. Booking Completed (Request Review)

**Add to:** `/roam-provider-app/shared/emailTemplates.ts`

```typescript
// Add to ROAM_EMAIL_TEMPLATES
bookingCompleted: (customerName: string, serviceName: string, providerName: string, bookingId: string) => {
  const content = `
    <h1>Service Completed! 🎉</h1>
    <p>Hi ${customerName},</p>
    <p>Your ${serviceName} service with ${providerName} has been completed. We hope you had a great experience!</p>
    
    <div class="highlight">
      <h3>📝 How Was Your Experience?</h3>
      <p>Your feedback helps other customers find great providers and supports the ones you love!</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://roamyourbestlife.com/review/${bookingId}" class="button">Leave a Review & Tip</a>
    </div>
    
    <div class="info-box">
      <p style="margin: 5px 0;">⭐ Rate your experience (1-5 stars)</p>
      <p style="margin: 5px 0;">💬 Share what you loved</p>
      <p style="margin: 5px 0;">💵 Add a tip for exceptional service (optional)</p>
    </div>
    
    <p>Thank you for choosing ROAM!<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Add to:** `/roam-provider-app/api/bookings/status-update.ts`

```typescript
// In sendStatusNotifications function, add this case:
else if (newStatus === 'completed' && options.notifyCustomer && customer?.user_id && customer?.email) {
  notificationType = 'customer_booking_completed';
  
  const emailHtml = ROAM_EMAIL_TEMPLATES.bookingCompleted(
    customer.first_name || 'Customer',
    booking.service_name || 'Service',
    provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
    booking.id
  );

  const emailSent = await EmailService.sendEmail({
    to: customer.email,
    subject: '🎉 Service Completed - Share Your Experience!',
    html: emailHtml
  });

  await supabase.from('notification_logs').insert({
    user_id: customer.user_id,
    notification_type: notificationType,
    channel: 'email',
    status: emailSent ? 'sent' : 'failed',
    body: JSON.stringify({ 
      customer_name: customer.first_name,
      service_name: booking.service_name,
      provider_name: provider ? `${provider.first_name} ${provider.last_name}` : 'Provider',
      booking_id: booking.id
    }),
    metadata: {
      booking_id: booking.id,
      email_to: customer.email,
      sent_at: new Date().toISOString()
    }
  });
}
```

---

### 3. Provider New Booking Notification

**Add to:** `/roam-customer-app/shared/emailTemplates.ts`

```typescript
// Note: This needs to be added to CUSTOMER app because that's where bookings are created

providerNewBooking: (providerName: string, customerName: string, serviceName: string, bookingDate: string, bookingTime: string) => {
  const content = `
    <h1>🔔 New Booking Request!</h1>
    <p>Hi ${providerName},</p>
    <p>Great news! You have a new booking request from <strong>${customerName}</strong>.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Booking Details</h2>
      <p style="margin: 10px 0;"><strong>Customer:</strong> ${customerName}</p>
      <p style="margin: 10px 0;"><strong>Service:</strong> ${serviceName}</p>
      <p style="margin: 10px 0;"><strong>Date:</strong> ${bookingDate}</p>
      <p style="margin: 10px 0;"><strong>Time:</strong> ${bookingTime}</p>
    </div>
    
    <div class="highlight">
      <p><strong>⏰ Action Required:</strong> Please review and accept or decline this booking within 24 hours.</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://www.roamprovider.com/bookings" class="button">Review Booking Now</a>
    </div>
    
    <p>Best regards,<br><strong>The ROAM Team</strong></p>
  `;
  return getROAMEmailTemplate(content);
}
```

**Add to:** Customer app booking creation endpoint

```typescript
// After booking is successfully created
if (provider?.email && provider?.user_id) {
  try {
    const emailHtml = ROAM_EMAIL_TEMPLATES.providerNewBooking(
      `${provider.first_name} ${provider.last_name}`,
      `${customer.first_name} ${customer.last_name}`,
      service.name,
      formatDate(booking.booking_date),
      formatTime(booking.start_time)
    );

    const emailSent = await EmailService.sendEmail({
      to: provider.email,
      subject: '🔔 New Booking Request!',
      html: emailHtml
    });

    await supabase.from('notification_logs').insert({
      user_id: provider.user_id,
      notification_type: 'provider_new_booking',
      channel: 'email',
      status: emailSent ? 'sent' : 'failed',
      body: JSON.stringify({
        provider_name: `${provider.first_name} ${provider.last_name}`,
        customer_name: `${customer.first_name} ${customer.last_name}`,
        service_name: service.name,
        booking_date: booking.booking_date,
        booking_time: booking.start_time
      }),
      metadata: {
        booking_id: booking.id,
        email_to: provider.email,
        sent_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('⚠️ Failed to notify provider (non-fatal):', error);
  }
}
```

---

### 4. Admin Business Verification

**Add to:** `/roam-provider-app/shared/emailTemplates.ts`

```typescript
businessVerificationNeeded: (businessName: string, businessId: string, submittedDate: string, applicantEmail: string) => {
  const content = `
    <h1>🔔 New Business Application Submitted</h1>
    <p>A new business has completed their application and requires verification.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">Application Details</h2>
      <p style="margin: 10px 0;"><strong>Business Name:</strong> ${businessName}</p>
      <p style="margin: 10px 0;"><strong>Application ID:</strong> ${businessId}</p>
      <p style="margin: 10px 0;"><strong>Applicant Email:</strong> ${applicantEmail}</p>
      <p style="margin: 10px 0;"><strong>Submitted:</strong> ${submittedDate}</p>
    </div>
    
    <div class="highlight">
      <h3>⏰ Action Required</h3>
      <p><strong>Review Tasks:</strong></p>
      <ul style="margin: 10px 0;">
        <li>Verify business documents</li>
        <li>Check credentials and certifications</li>
        <li>Review background check results</li>
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

**Add to:** `/roam-provider-app/api/onboarding/submit-application.ts`

```typescript
// After successful application submission
const ADMIN_EMAILS = [
  'admin@roamyourbestlife.com',
  'verification@roamyourbestlife.com'
];

for (const adminEmail of ADMIN_EMAILS) {
  try {
    const emailHtml = ROAM_EMAIL_TEMPLATES.businessVerificationNeeded(
      businessData.business_name,
      businessId,
      new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      email
    );

    await EmailService.sendEmail({
      to: adminEmail,
      subject: '🔔 New Business Application - Verification Required',
      html: emailHtml
    });

    // Note: For admin notifications, you might not log to notification_logs
    // or you might log with a system user_id
    console.log(`✅ Admin notification sent to ${adminEmail}`);
  } catch (error) {
    console.error(`⚠️ Failed to notify admin ${adminEmail}:`, error);
  }
}
```

---

## 🛠️ Helper Functions You'll Need

### Date/Time Formatting

```typescript
// Add these to your utils
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatTime(timeString: string): string {
  return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
```

### Shared Email Template Wrapper

Make sure each app has this base template:

```typescript
export function getROAMEmailTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>ROAM - Your Best Life. Everywhere.</title>
      <style>
        /* Your existing styles from shared/emailTemplates.ts */
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="logo">
          <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM" />
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
          <p>© 2024 ROAM. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
```

---

## ✅ Testing Checklist

For each notification you implement:

1. [ ] Add template to emailTemplates.ts
2. [ ] Add email sending code to trigger point
3. [ ] Test with real email address
4. [ ] Verify email received
5. [ ] Check formatting looks good
6. [ ] Verify links work
7. [ ] Check notification_logs entry created
8. [ ] Test error handling (wrong email)
9. [ ] Check Resend dashboard
10. [ ] Document in changelog

---

## 🚀 Recommended Implementation Order

### Week 1 (Immediate Impact)
1. ✅ customer_booking_accepted (Done!)
2. customer_welcome (Sign-up flow)
3. provider_new_booking (Critical for providers)

### Week 2 (High Value)
4. customer_booking_completed (Drives reviews)
5. admin_business_verification (Internal efficiency)

### Week 3 (Nice-to-Have)
6. provider_booking_cancelled
7. provider_booking_rescheduled
8. customer_booking_reminder (needs cron job)

---

## 📦 Need Help Finding Files?

```bash
# Find signup/auth files
find . -name "*signup*" -o -name "*auth*" -o -name "*register*" | grep -v node_modules

# Find booking creation files
find . -name "*booking*" | grep -E "(create|new)" | grep -v node_modules

# Find application submission
find . -name "*application*" -o -name "*onboarding*" | grep -v node_modules
```

---

**Ready to implement?** Start with customer_welcome (easiest) or provider_new_booking (highest impact)!

