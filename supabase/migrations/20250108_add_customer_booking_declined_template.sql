-- Add customer_booking_declined notification template
-- This notifies customers when a provider declines their booking request

INSERT INTO notification_templates (
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
  'customer_booking_declined',
  'Customer Booking Declined',
  'Sent to customers when a provider declines their booking request',
  
  -- Email Subject
  'Booking Request Declined - {{service_name}}',
  
  -- Email Body HTML
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background-color: #2C5F7D; padding: 30px 20px; text-align: center; }
    .logo { max-width: 200px; height: auto; }
    .content { padding: 40px 30px; }
    .title { color: #DC3545; font-size: 24px; font-weight: bold; margin: 0 0 20px 0; }
    .message { color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px; }
    .info-box { background-color: #FFF3CD; border-left: 4px solid: #FFC107; padding: 20px; margin: 30px 0; border-radius: 4px; }
    .info-label { color: #856404; font-weight: bold; font-size: 14px; margin-bottom: 5px; }
    .info-value { color: #333333; font-size: 16px; margin-bottom: 15px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #F4A300; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .button:hover { background-color: #d89000; }
    .reason-box { background-color: #F8F9FA; padding: 15px; border-radius: 4px; margin: 20px 0; }
    .footer { background-color: #f8f9fa; padding: 30px; text-align: center; color: #666666; font-size: 14px; }
    .divider { border-top: 1px solid #e0e0e0; margin: 30px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/website-images/roam-logo-white.png" alt="ROAM Logo" class="logo">
    </div>
    
    <div class="content">
      <div class="title">❌ Booking Request Declined</div>
      
      <p class="message">Hi {{customer_name}},</p>
      
      <p class="message">Unfortunately, {{provider_name}} is unable to accept your booking request at this time.</p>
      
      <div class="info-box">
        <div class="info-label">Service:</div>
        <div class="info-value">{{service_name}}</div>
        
        <div class="info-label">Provider:</div>
        <div class="info-value">{{provider_name}}</div>
        
        <div class="info-label">Date:</div>
        <div class="info-value">{{booking_date}}</div>
        
        <div class="info-label">Time:</div>
        <div class="info-value">{{booking_time}}</div>
        
        <div class="info-label">Location:</div>
        <div class="info-value">{{booking_location}}</div>
      </div>
      
      <div class="reason-box">
        <p style="margin: 0; color: #666;"><strong>Reason:</strong> {{decline_reason}}</p>
      </div>
      
      <p class="message">We understand this may be disappointing. Here are your options:</p>
      
      <ul class="message">
        <li>Browse other available providers for this service</li>
        <li>Try booking a different date or time</li>
        <li>Contact our support team for assistance</li>
      </ul>
      
      <div style="text-align: center;">
        <a href="https://roamyourbestlife.com/customer/bookings" class="button">Find Another Provider</a>
      </div>
      
      <div class="divider"></div>
      
      <p class="message">If you have any questions or need help finding an alternative provider, please don''t hesitate to contact our support team.</p>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;"><strong>ROAM - Your Best Life. Everywhere.</strong></p>
      <p style="margin: 0 0 10px 0;">
        Need help? Contact us at 
        <a href="mailto:support@roamyourbestlife.com" style="color: #2C5F7D;">support@roamyourbestlife.com</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #999999;">
        © 2024 ROAM. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>',
  
  -- Email Body Text
  'Hi {{customer_name}},

Unfortunately, {{provider_name}} is unable to accept your booking request at this time.

BOOKING DETAILS:
Service: {{service_name}}
Provider: {{provider_name}}
Date: {{booking_date}}
Time: {{booking_time}}
Location: {{booking_location}}

REASON: {{decline_reason}}

YOUR OPTIONS:
• Browse other available providers for this service
• Try booking a different date or time
• Contact our support team for assistance

Find another provider: https://roamyourbestlife.com/customer/bookings

If you need help finding an alternative provider, please contact us at support@roamyourbestlife.com.

Best regards,
The ROAM Team

© 2024 ROAM. All rights reserved.',
  
  -- SMS Body
  'ROAM: Your booking request for {{service_name}} on {{booking_date}} at {{booking_time}} was declined by {{provider_name}}. Reason: {{decline_reason}}. Find another provider: roamyourbestlife.com',
  
  -- Variables
  '["customer_name", "provider_name", "service_name", "booking_date", "booking_time", "booking_location", "decline_reason", "booking_id"]'::jsonb,
  
  -- Active
  true
);

