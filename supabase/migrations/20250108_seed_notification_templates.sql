-- ============================================================================
-- NOTIFICATION SYSTEM - INDEXES & TEMPLATES
-- ============================================================================
-- This migration adds:
-- 1. Performance indexes for notification_logs and notification_templates
-- 2. All 8 notification templates (email HTML, email text, SMS)
-- 3. Consistent ROAM branding with logo across all templates
-- ============================================================================

-- ============================================================================
-- PART 1: CREATE INDEXES
-- ============================================================================

-- Indexes for notification_logs (for querying and reporting)
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON public.notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_notification_type ON public.notification_logs(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON public.notification_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_status ON public.notification_logs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_type_status ON public.notification_logs(notification_type, status);

-- Indexes for notification_templates (for fast template lookups)
CREATE INDEX IF NOT EXISTS idx_notification_templates_template_key ON public.notification_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_active ON public.notification_templates(is_active);

-- ============================================================================
-- PART 2: INSERT NOTIFICATION TEMPLATES
-- ============================================================================

-- 1. CUSTOMER WELCOME
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'customer_welcome',
  'Customer Welcome Email',
  'Sent when a new customer creates an account',
  'Welcome to ROAM - Your Best Life, Everywhere! 🎉',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>Welcome to ROAM! 🏖️</h1>
      <p>Hi {{customer_name}},</p>
      <p>We''re thrilled to have you join the ROAM family! You now have access to Florida''s premier on-demand services marketplace.</p>
      <p><strong>What you can do:</strong></p>
      <ul>
        <li>📅 Book services from verified professionals</li>
        <li>⭐ Save your favorite providers</li>
        <li>💳 Track all your bookings in one place</li>
        <li>🔔 Get real-time updates on your services</li>
      </ul>
      <p style="text-align: center;">
        <a href="https://roamyourbestlife.com/booknow" class="button">Start Booking Now</a>
      </p>
      <p>Need help getting started? Our support team is here for you!</p>
      <p>Best regards,<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
      <p style="font-size: 12px; color: #9ca3af;">
        <a href="https://roamyourbestlife.com">roamyourbestlife.com</a>
      </p>
    </div>
  </div>
</body>
</html>',
  'Hi {{customer_name}},

Welcome to ROAM! We''re thrilled to have you join our community.

You now have access to Florida''s premier on-demand services marketplace where you can:
• Book services from verified professionals
• Save your favorite providers
• Track all your bookings in one place
• Get real-time updates on your services

Start booking now: https://roamyourbestlife.com/booknow

Need help? Our support team is here for you!

Best regards,
The ROAM Team

ROAM - Your Best Life, Everywhere.
https://roamyourbestlife.com',
  'Welcome to ROAM, {{customer_name}}! 🎉 Book premium services from verified professionals. Start now: roamyourbestlife.com/booknow',
  '["customer_name"]',
  true
);

-- 2. CUSTOMER BOOKING ACCEPTED
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'customer_booking_accepted',
  'Customer Booking Accepted',
  'Sent when a provider accepts a customer''s booking',
  '✅ Your Booking is Confirmed!',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .booking-card {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #10b981;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>✅ Booking Confirmed!</h1>
      <p>Great news, {{customer_name}}!</p>
      <p><strong>{{provider_name}}</strong> has accepted your booking and is looking forward to serving you.</p>
      
      <div class="booking-card">
        <h3>📋 Booking Details</h3>
        <div class="detail-row">
          <span><strong>Service:</strong></span>
          <span>{{service_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Provider:</strong></span>
          <span>{{provider_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Date:</strong></span>
          <span>{{booking_date}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Time:</strong></span>
          <span>{{booking_time}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Location:</strong></span>
          <span>{{booking_location}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Total:</strong></span>
          <span><strong>${{total_amount}}</strong></span>
        </div>
      </div>

      <p>You''ll receive a reminder before your appointment. If you need to make any changes, please contact support.</p>
      
      <p style="text-align: center;">
        <a href="https://roamyourbestlife.com/my-bookings" class="button">View Booking</a>
      </p>

      <p>See you soon!<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Booking ID: {{booking_id}}</p>
      <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Great news, {{customer_name}}!

{{provider_name}} has accepted your booking.

BOOKING DETAILS:
Service: {{service_name}}
Provider: {{provider_name}}
Date: {{booking_date}}
Time: {{booking_time}}
Location: {{booking_location}}
Total: ${{total_amount}}

You''ll receive a reminder before your appointment.

View your booking: https://roamyourbestlife.com/my-bookings

Booking ID: {{booking_id}}

The ROAM Team
https://roamyourbestlife.com',
  '✅ Booking confirmed! {{provider_name}} will see you on {{booking_date}} at {{booking_time}}. View details: roamyourbestlife.com/my-bookings',
  '["customer_name", "provider_name", "service_name", "booking_date", "booking_time", "booking_location", "total_amount", "booking_id"]',
  true
);

-- 3. CUSTOMER BOOKING COMPLETED
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'customer_booking_completed',
  'Customer Booking Completed',
  'Sent when a booking is marked as completed',
  '🎉 Service Completed - Share Your Experience!',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .stars {
      font-size: 32px;
      text-align: center;
      margin: 20px 0;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 10px 5px;
    }
    .button-secondary {
      background-color: #10b981;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>🎉 Service Completed!</h1>
      <p>Hi {{customer_name}},</p>
      <p>Your service with <strong>{{provider_name}}</strong> has been completed!</p>
      
      <p><strong>{{service_name}}</strong></p>

      <div class="stars">⭐⭐⭐⭐⭐</div>

      <p style="text-align: center; font-size: 18px; color: #4F46E5;">
        <strong>How was your experience?</strong>
      </p>

      <p>Your feedback helps us maintain quality and helps other customers make informed decisions.</p>

      <p style="text-align: center;">
        <a href="https://roamyourbestlife.com/review/{{provider_id}}?booking={{booking_id}}" class="button">Leave a Review</a>
        <a href="https://roamyourbestlife.com/booknow" class="button button-secondary">Book Again</a>
      </p>

      <p>Thank you for choosing ROAM!</p>
      <p>Best regards,<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Booking ID: {{booking_id}}</p>
      <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{customer_name}},

Your service with {{provider_name}} has been completed!

Service: {{service_name}}

How was your experience? ⭐⭐⭐⭐⭐

Your feedback helps us maintain quality and helps other customers make informed decisions.

Leave a review: https://roamyourbestlife.com/review/{{provider_id}}?booking={{booking_id}}

Book again: https://roamyourbestlife.com/booknow

Thank you for choosing ROAM!

Booking ID: {{booking_id}}

The ROAM Team
https://roamyourbestlife.com',
  '🎉 Service with {{provider_name}} completed! How was it? Leave a review: roamyourbestlife.com/review/{{provider_id}}',
  '["customer_name", "provider_name", "service_name", "provider_id", "booking_id"]',
  true
);

-- 4. CUSTOMER BOOKING REMINDER
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'customer_booking_reminder',
  'Customer Booking Reminder',
  'Sent 24 hours before a scheduled booking',
  '⏰ Reminder: Your Service is Tomorrow!',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .reminder-card {
      background-color: #fef3c7;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #f59e0b;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #fde68a;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>⏰ Reminder: Service Tomorrow!</h1>
      <p>Hi {{customer_name}},</p>
      <p>This is a friendly reminder that you have a service scheduled for tomorrow!</p>
      
      <div class="reminder-card">
        <h3>📋 Booking Details</h3>
        <div class="detail-row">
          <span><strong>Service:</strong></span>
          <span>{{service_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Provider:</strong></span>
          <span>{{provider_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Date:</strong></span>
          <span>{{booking_date}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Time:</strong></span>
          <span>{{booking_time}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Location:</strong></span>
          <span>{{booking_location}}</span>
        </div>
      </div>

      <p><strong>Important:</strong> If you need to cancel or reschedule, please do so at least 24 hours in advance to avoid cancellation fees.</p>
      
      <p style="text-align: center;">
        <a href="https://roamyourbestlife.com/my-bookings" class="button">View Booking</a>
      </p>

      <p>Looking forward to serving you!<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Booking ID: {{booking_id}}</p>
      <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{customer_name}},

Reminder: You have a service scheduled for tomorrow!

BOOKING DETAILS:
Service: {{service_name}}
Provider: {{provider_name}}
Date: {{booking_date}}
Time: {{booking_time}}
Location: {{booking_location}}

Important: If you need to cancel or reschedule, please do so at least 24 hours in advance to avoid cancellation fees.

View booking: https://roamyourbestlife.com/my-bookings

Booking ID: {{booking_id}}

The ROAM Team
https://roamyourbestlife.com',
  '⏰ Reminder: {{service_name}} with {{provider_name}} tomorrow at {{booking_time}}. See you then!',
  '["customer_name", "service_name", "provider_name", "booking_date", "booking_time", "booking_location", "booking_id"]',
  true
);

-- 5. PROVIDER NEW BOOKING
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'provider_new_booking',
  'Provider New Booking',
  'Sent when a provider receives a new booking request',
  '🔔 New Booking Request!',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .booking-card {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #3b82f6;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .alert {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>🔔 New Booking Request!</h1>
      <p>Hi {{provider_name}},</p>
      <p>You have a new booking request from <strong>{{customer_name}}</strong>!</p>
      
      <div class="booking-card">
        <h3>📋 Booking Details</h3>
        <div class="detail-row">
          <span><strong>Service:</strong></span>
          <span>{{service_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Customer:</strong></span>
          <span>{{customer_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Date:</strong></span>
          <span>{{booking_date}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Time:</strong></span>
          <span>{{booking_time}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Location:</strong></span>
          <span>{{booking_location}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Amount:</strong></span>
          <span><strong>${{booking_amount}}</strong></span>
        </div>
      </div>

      <div class="alert">
        <strong>⏰ Action Required:</strong> Please review and accept this booking as soon as possible. The customer is waiting for your confirmation!
      </div>
      
      <p style="text-align: center;">
        <a href="https://roamprovider.com/bookings" class="button">Review Booking</a>
      </p>

      <p>Best regards,<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Booking ID: {{booking_id}}</p>
      <p>Need help? Contact us at <a href="mailto:providersupport@roamyourbestlife.com">providersupport@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{provider_name}},

You have a new booking request!

BOOKING DETAILS:
Service: {{service_name}}
Customer: {{customer_name}}
Date: {{booking_date}}
Time: {{booking_time}}
Location: {{booking_location}}
Amount: ${{booking_amount}}

⏰ Action Required: Please review and accept this booking as soon as possible.

Review booking: https://roamprovider.com/bookings

Booking ID: {{booking_id}}

The ROAM Team
https://roamprovider.com',
  '🔔 New booking from {{customer_name}} for {{booking_date}} at {{booking_time}}. Review now: roamprovider.com/bookings',
  '["provider_name", "customer_name", "service_name", "booking_date", "booking_time", "booking_location", "booking_amount", "booking_id"]',
  true
);

-- 6. PROVIDER BOOKING CANCELLED
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'provider_booking_cancelled',
  'Provider Booking Cancelled',
  'Sent when a customer cancels a booking',
  '❌ Booking Cancelled',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .booking-card {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #ef4444;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .reason {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>❌ Booking Cancelled</h1>
      <p>Hi {{provider_name}},</p>
      <p>A booking has been cancelled by <strong>{{customer_name}}</strong>.</p>
      
      <div class="booking-card">
        <h3>📋 Cancelled Booking</h3>
        <div class="detail-row">
          <span><strong>Service:</strong></span>
          <span>{{service_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Customer:</strong></span>
          <span>{{customer_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Date:</strong></span>
          <span>{{booking_date}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Time:</strong></span>
          <span>{{booking_time}}</span>
        </div>
      </div>

      <div class="reason">
        <strong>Cancellation Reason:</strong><br>
        {{cancellation_reason}}
      </div>

      <p>This time slot is now available for other bookings. Your schedule has been updated automatically.</p>

      <p>Best regards,<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Need help? Contact us at <a href="mailto:providersupport@roamyourbestlife.com">providersupport@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{provider_name}},

A booking has been cancelled by {{customer_name}}.

CANCELLED BOOKING:
Service: {{service_name}}
Customer: {{customer_name}}
Date: {{booking_date}}
Time: {{booking_time}}

Cancellation Reason:
{{cancellation_reason}}

This time slot is now available for other bookings. Your schedule has been updated automatically.

The ROAM Team
https://roamprovider.com',
  '❌ Booking cancelled: {{customer_name}} - {{service_name}} on {{booking_date}}. Time slot now available.',
  '["provider_name", "customer_name", "service_name", "booking_date", "booking_time", "cancellation_reason"]',
  true
);

-- 7. PROVIDER BOOKING RESCHEDULED
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'provider_booking_rescheduled',
  'Provider Booking Rescheduled',
  'Sent when a customer reschedules a booking',
  '🔄 Booking Rescheduled',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .booking-card {
      background-color: #f8f9fa;
      padding: 20px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .old-time {
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 10px 0;
      background-color: #fef2f2;
      border-radius: 6px;
    }
    .new-time {
      border-left: 4px solid #10b981;
      padding: 15px;
      margin: 10px 0;
      background-color: #f0fdf4;
      border-radius: 6px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>🔄 Booking Rescheduled</h1>
      <p>Hi {{provider_name}},</p>
      <p><strong>{{customer_name}}</strong> has rescheduled their booking.</p>
      
      <div class="booking-card">
        <h3>📋 {{service_name}}</h3>
        
        <div class="old-time">
          <strong>❌ Previous Time:</strong><br>
          {{old_booking_date}} at {{old_booking_time}}
        </div>

        <div class="new-time">
          <strong>✅ New Time:</strong><br>
          {{new_booking_date}} at {{new_booking_time}}
        </div>

        <div class="detail-row">
          <span><strong>Location:</strong></span>
          <span>{{booking_location}}</span>
        </div>
      </div>

      <p>Your schedule has been updated automatically. Please confirm your availability for the new time.</p>
      
      <p style="text-align: center;">
        <a href="https://roamprovider.com/bookings" class="button">View Updated Schedule</a>
      </p>

      <p>Best regards,<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Booking ID: {{booking_id}}</p>
      <p>Need help? Contact us at <a href="mailto:providersupport@roamyourbestlife.com">providersupport@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hi {{provider_name}},

{{customer_name}} has rescheduled their booking.

Service: {{service_name}}

Previous Time:
{{old_booking_date}} at {{old_booking_time}}

New Time:
{{new_booking_date}} at {{new_booking_time}}

Location: {{booking_location}}

Your schedule has been updated automatically. Please confirm your availability for the new time.

View schedule: https://roamprovider.com/bookings

Booking ID: {{booking_id}}

The ROAM Team
https://roamprovider.com',
  '🔄 {{customer_name}} rescheduled to {{new_booking_date}} at {{new_booking_time}}. Confirm availability: roamprovider.com/bookings',
  '["provider_name", "customer_name", "service_name", "old_booking_date", "old_booking_time", "new_booking_date", "new_booking_time", "booking_location", "booking_id"]',
  true
);

-- 8. ADMIN BUSINESS VERIFICATION
INSERT INTO public.notification_templates (
  template_key,
  template_name,
  description,
  email_subject,
  email_body_html,
  email_body_text,
  sms_body,
  variables,
  is_active
) VALUES (
  'admin_business_verification',
  'Admin Business Verification Alert',
  'Sent to admins when a new business needs verification',
  '🔔 New Business Awaiting Verification',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - Your Best Life. Everywhere.</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f9fafb;
    }
    .email-container {
      background-color: white;
      border-radius: 8px;
      padding: 40px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .logo {
      text-align: center;
      margin-bottom: 30px;
    }
    .logo img {
      max-width: 200px;
      height: auto;
    }
    .content {
      margin-bottom: 30px;
    }
    .business-card {
      background-color: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #6366f1;
      margin: 25px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .alert {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
    }
    .button {
      display: inline-block;
      background-color: #4F46E5;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1, h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>🔔 New Business Application</h1>
      <p>Hi Admin,</p>
      <p>A new business has completed their application and is awaiting verification.</p>
      
      <div class="business-card">
        <h3>🏢 Business Details</h3>
        <div class="detail-row">
          <span><strong>Business Name:</strong></span>
          <span>{{business_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Owner:</strong></span>
          <span>{{owner_name}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Email:</strong></span>
          <span>{{contact_email}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Phone:</strong></span>
          <span>{{contact_phone}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Category:</strong></span>
          <span>{{business_category}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Location:</strong></span>
          <span>{{business_location}}</span>
        </div>
        <div class="detail-row">
          <span><strong>Submitted:</strong></span>
          <span>{{submission_date}}</span>
        </div>
      </div>

      <div class="alert">
        <strong>⏰ Action Required:</strong> Please review the business application, verify documents, and approve or reject within 48 hours.
      </div>
      
      <p style="text-align: center;">
        <a href="https://roamadmin.app/admin/providers" class="button">Review Application</a>
      </p>

      <p>ROAM Admin Team</p>
    </div>
    <div class="footer">
      <p>Business ID: {{business_id}}</p>
      <p>Need help? Contact us at <a href="mailto:admin@roamyourbestlife.com">admin@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
  'Hi Admin,

A new business has completed their application and is awaiting verification.

BUSINESS DETAILS:
Business Name: {{business_name}}
Owner: {{owner_name}}
Email: {{contact_email}}
Phone: {{contact_phone}}
Category: {{business_category}}
Location: {{business_location}}
Submitted: {{submission_date}}

⏰ Action Required: Please review the business application, verify documents, and approve or reject within 48 hours.

Review application: https://roamadmin.app/admin/providers

Business ID: {{business_id}}

ROAM Admin Team
https://roamadmin.app',
  '🔔 New business application: {{business_name}} - {{business_category}}. Review now: roamadmin.app/admin/providers',
  '["business_name", "owner_name", "contact_email", "contact_phone", "business_category", "business_location", "submission_date", "business_id"]',
  true
);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the migration was successful:

-- 1. Check that all 8 templates were created
-- SELECT template_key, template_name, is_active FROM public.notification_templates ORDER BY template_key;

-- 2. Verify indexes were created
-- SELECT indexname FROM pg_indexes WHERE tablename IN ('notification_logs', 'notification_templates');

-- 3. Count templates by active status
-- SELECT is_active, COUNT(*) FROM public.notification_templates GROUP BY is_active;

-- ============================================================================
-- MIGRATION COMPLETE ✅
-- ============================================================================
