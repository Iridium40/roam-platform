-- ============================================================================
-- ADD BUSINESS NEW BOOKING NOTIFICATION TEMPLATE
-- ============================================================================
-- This migration adds a notification template for business owners
-- when a new booking is created for their business.
-- ============================================================================

-- Insert the business_new_booking template
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
  'business_new_booking',
  'Business New Booking Notification',
  'Sent to business contact email when a new booking is created',
  'New Booking: {{service_name}} with {{customer_name}}',
  '<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ROAM - New Booking</title>
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
    .header {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
      margin: -40px -40px 30px -40px;
    }
    .logo {
      margin-bottom: 15px;
    }
    .logo img {
      max-width: 150px;
      height: auto;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      margin-bottom: 30px;
    }
    .booking-details {
      background-color: #f3f4f6;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    .booking-details h3 {
      margin-top: 0;
      color: #4F46E5;
      font-size: 16px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #374151;
    }
    .detail-value {
      color: #6b7280;
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
    .highlight {
      background-color: #EEF2FF;
      border-left: 4px solid #4F46E5;
      padding: 15px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="logo">
        <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=150" alt="ROAM" />
      </div>
      <h1>New Booking Received!</h1>
    </div>
    <div class="content">
      <p>Hello,</p>
      <p>Great news! A new booking has been made for <strong>{{business_name}}</strong>.</p>
      
      <div class="booking-details">
        <h3>📅 Booking Details</h3>
        <div class="detail-row">
          <span class="detail-label">Reference:</span>
          <span class="detail-value">{{booking_reference}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Service:</span>
          <span class="detail-value">{{service_name}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Customer:</span>
          <span class="detail-value">{{customer_name}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Date:</span>
          <span class="detail-value">{{booking_date}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Time:</span>
          <span class="detail-value">{{booking_time}}</span>
        </div>
        <div class="detail-row">
          <span class="detail-label">Amount:</span>
          <span class="detail-value">${{total_amount}}</span>
        </div>
      </div>

      <div class="highlight">
        <strong>Special Instructions:</strong><br>
        {{special_instructions}}
      </div>

      <p style="text-align: center;">
        <a href="https://www.roamprovider.com/dashboard/bookings" class="button">View in Dashboard</a>
      </p>
      
      <p>Please ensure the booking is assigned to a provider and accepted promptly.</p>
      
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
  'Hello,

A new booking has been made for {{business_name}}.

BOOKING DETAILS
---------------
Reference: {{booking_reference}}
Service: {{service_name}}
Customer: {{customer_name}}
Date: {{booking_date}}
Time: {{booking_time}}
Amount: ${{total_amount}}

Special Instructions: {{special_instructions}}

Please log in to your provider dashboard to view and manage this booking:
https://www.roamprovider.com/dashboard/bookings

Best regards,
The ROAM Team

---
Need help? Contact support@roamyourbestlife.com
© 2024 ROAM. All rights reserved.',
  'ROAM: New booking! {{service_name}} with {{customer_name}} on {{booking_date}} at {{booking_time}}. Amount: ${{total_amount}}. View in dashboard.',
  '["customer_name", "service_name", "business_name", "booking_date", "booking_time", "booking_reference", "total_amount", "special_instructions", "booking_id"]'::jsonb,
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  description = EXCLUDED.description,
  email_subject = EXCLUDED.email_subject,
  email_body_html = EXCLUDED.email_body_html,
  email_body_text = EXCLUDED.email_body_text,
  sms_body = EXCLUDED.sms_body,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Add comment to document the template
COMMENT ON TABLE public.notification_templates IS 
  'Stores notification templates for email and SMS communications';
