-- Update all customer booking notification templates to use the new booking details page URL
-- This directs customers to /my-bookings/{booking_id} where they can view full booking details

-- ============================================================================
-- 1. UPDATE customer_booking_completed
-- ============================================================================
UPDATE public.notification_templates
SET email_body_html = '<!DOCTYPE html>
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
      background-color: #2C5F7D;
      color: white !important;
      padding: 14px 28px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 10px 5px;
    }
    .button-secondary {
      background-color: #10b981;
    }
    .button-tip {
      background-color: #ec4899;
    }
    .cta-section {
      background-color: #f0f9ff;
      border-radius: 8px;
      padding: 24px;
      margin: 24px 0;
      text-align: center;
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
      color: #2C5F7D;
    }
    a {
      color: #2C5F7D;
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

      <div class="cta-section">
        <div class="stars">⭐⭐⭐⭐⭐</div>
        <p style="font-size: 18px; color: #2C5F7D; margin-bottom: 16px;">
          <strong>How was your experience?</strong>
        </p>
        <p style="color: #6b7280; margin-bottom: 20px;">
          Share your feedback and show appreciation for your provider!
        </p>
        <p>
          <a href="https://roamyourbestlife.com/my-bookings/{{booking_id}}" class="button">View Booking & Leave Review</a>
        </p>
        <p style="margin-top: 12px;">
          <a href="https://roamyourbestlife.com/my-bookings/{{booking_id}}" class="button button-tip">💝 Send a Tip</a>
        </p>
      </div>

      <p>Your feedback helps us maintain quality and helps other customers make informed decisions.</p>

      <p style="text-align: center; margin-top: 24px;">
        <a href="https://roamyourbestlife.com/booknow" class="button button-secondary">Book Again</a>
      </p>

      <p>Thank you for choosing ROAM!</p>
      <p>Best regards,<br>The ROAM Team</p>
    </div>
    <div class="footer">
      <p>Booking Reference: {{booking_reference}}</p>
      <p>Need help? Contact us at <a href="mailto:support@roamyourbestlife.com">support@roamyourbestlife.com</a></p>
      <p>© 2024 ROAM. All rights reserved.</p>
    </div>
  </div>
</body>
</html>',
email_body_text = 'Hi {{customer_name}},

Your service with {{provider_name}} has been completed!

Service: {{service_name}}

⭐⭐⭐⭐⭐ How was your experience?

Share your feedback and show appreciation for your provider!

👉 View booking details, leave a review, and send a tip:
https://roamyourbestlife.com/my-bookings/{{booking_id}}

Your feedback helps us maintain quality and helps other customers make informed decisions.

Book again: https://roamyourbestlife.com/booknow

Thank you for choosing ROAM!

Booking Reference: {{booking_reference}}

The ROAM Team
https://roamyourbestlife.com',
sms_body = '🎉 Your service with {{provider_name}} is complete! Leave a review & send a tip: roamyourbestlife.com/my-bookings/{{booking_id}}'
WHERE template_key = 'customer_booking_completed';

-- ============================================================================
-- 2. UPDATE customer_booking_accepted
-- ============================================================================
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'https://roamyourbestlife.com/my-bookings"',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}"'
),
email_body_text = REPLACE(
  email_body_text,
  'https://roamyourbestlife.com/my-bookings',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}'
),
sms_body = '✅ Booking confirmed! {{provider_name}} will see you on {{booking_date}} at {{booking_time}}. View details: roamyourbestlife.com/my-bookings/{{booking_id}}'
WHERE template_key = 'customer_booking_accepted'
AND email_body_html NOT LIKE '%/my-bookings/{{booking_id}}%';

-- ============================================================================
-- 3. UPDATE customer_booking_reminder
-- ============================================================================
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'https://roamyourbestlife.com/my-bookings"',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}"'
),
email_body_text = REPLACE(
  email_body_text,
  'https://roamyourbestlife.com/my-bookings',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}'
),
sms_body = '⏰ Reminder: {{service_name}} with {{provider_name}} tomorrow at {{booking_time}}. View details: roamyourbestlife.com/my-bookings/{{booking_id}}'
WHERE template_key = 'customer_booking_reminder'
AND email_body_html NOT LIKE '%/my-bookings/{{booking_id}}%';

-- ============================================================================
-- 4. UPDATE customer_booking_declined
-- ============================================================================
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'https://roamyourbestlife.com/customer/bookings"',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}"'
),
email_body_text = REPLACE(
  email_body_text,
  'https://roamyourbestlife.com/customer/bookings',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}'
),
sms_body = '❌ Your {{service_name}} booking on {{booking_date}} was declined. View details: roamyourbestlife.com/my-bookings/{{booking_id}}'
WHERE template_key = 'customer_booking_declined';

-- ============================================================================
-- 5. UPDATE customer_booking_no_show
-- ============================================================================
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'https://roamyourbestlife.com/my-bookings"',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}"'
),
email_body_text = REPLACE(
  email_body_text,
  'https://roamyourbestlife.com/my-bookings',
  'https://roamyourbestlife.com/my-bookings/{{booking_id}}'
),
sms_body = '⚠️ You missed your {{service_name}} appointment on {{booking_date}}. View details: roamyourbestlife.com/my-bookings/{{booking_id}}'
WHERE template_key = 'customer_booking_no_show'
AND email_body_html NOT LIKE '%/my-bookings/{{booking_id}}%';

-- ============================================================================
-- VERIFICATION: Check all templates have the new URL
-- ============================================================================
SELECT 
  template_key,
  template_name,
  CASE 
    WHEN email_body_html LIKE '%/my-bookings/{{booking_id}}%' THEN '✓ Email has booking details URL'
    ELSE '✗ Email missing booking details URL'
  END as email_status,
  CASE 
    WHEN email_body_text LIKE '%/my-bookings/{{booking_id}}%' THEN '✓ Text has booking details URL'
    ELSE '✗ Text missing booking details URL'
  END as text_status,
  CASE 
    WHEN sms_body LIKE '%/my-bookings/{{booking_id}}%' THEN '✓ SMS has booking details URL'
    ELSE '✗ SMS missing booking details URL'
  END as sms_status
FROM public.notification_templates
WHERE template_key IN (
  'customer_booking_accepted',
  'customer_booking_completed',
  'customer_booking_reminder',
  'customer_booking_declined',
  'customer_booking_no_show'
)
ORDER BY template_key;
