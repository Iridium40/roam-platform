-- Add customer_booking_no_show notification template
-- This notifies customers when they are marked as a no-show for their booking

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
  'customer_booking_no_show',
  'Customer Booking No-Show',
  'Sent to customers when they are marked as a no-show for their booking',
  
  -- Email Subject
  'Missed Appointment - {{service_name}}',
  
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
    .info-box { background-color: #FFF3CD; border-left: 4px solid #FFC107; padding: 20px; margin: 30px 0; border-radius: 4px; }
    .info-label { color: #856404; font-weight: bold; font-size: 14px; margin-bottom: 5px; }
    .info-value { color: #333333; font-size: 16px; margin-bottom: 15px; }
    .warning-box { background-color: #F8D7DA; border-left: 4px solid #DC3545; padding: 20px; margin: 30px 0; border-radius: 4px; }
    .button { display: inline-block; padding: 15px 30px; background-color: #F4A300; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
    .button:hover { background-color: #d89000; }
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
      <div class="title">⚠️ Missed Appointment</div>
      
      <p class="message">Hi {{customer_name}},</p>
      
      <p class="message">We noticed you didn''t arrive for your scheduled appointment. Your booking has been marked as a no-show.</p>
      
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
      
      <div class="warning-box">
        <p style="margin: 0; color: #721c24;"><strong>Important:</strong> As per our cancellation policy, the full booking amount of <strong>${{total_amount}}</strong> has been charged. No-shows are not eligible for refunds.</p>
      </div>
      
      <p class="message">If you believe this was a mistake or there were extenuating circumstances, please contact our support team as soon as possible.</p>
      
      <div style="text-align: center;">
        <a href="https://roamyourbestlife.com/my-bookings" class="button">View My Bookings</a>
      </div>
      
      <div class="divider"></div>
      
      <p class="message">We hope to see you at your next appointment! To avoid future no-shows, please:</p>
      <ul class="message">
        <li>Set a reminder for your appointment</li>
        <li>Cancel at least 24 hours in advance if you can''t make it</li>
        <li>Contact the provider if you''re running late</li>
      </ul>
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

We noticed you didn''t arrive for your scheduled appointment. Your booking has been marked as a no-show.

BOOKING DETAILS:
Service: {{service_name}}
Provider: {{provider_name}}
Date: {{booking_date}}
Time: {{booking_time}}
Location: {{booking_location}}

IMPORTANT: As per our cancellation policy, the full booking amount of ${{total_amount}} has been charged. No-shows are not eligible for refunds.

If you believe this was a mistake or there were extenuating circumstances, please contact our support team as soon as possible.

View your bookings: https://roamyourbestlife.com/my-bookings

To avoid future no-shows, please:
• Set a reminder for your appointment
• Cancel at least 24 hours in advance if you can''t make it
• Contact the provider if you''re running late

Need help? Contact us at support@roamyourbestlife.com

Best regards,
The ROAM Team

© 2024 ROAM. All rights reserved.',
  
  -- SMS Body
  'ROAM: You missed your {{service_name}} appointment on {{booking_date}} at {{booking_time}}. This has been marked as a no-show. Contact support if this was an error.',
  
  -- Variables
  '["customer_name", "provider_name", "service_name", "booking_date", "booking_time", "booking_location", "total_amount", "booking_id"]'::jsonb,
  
  -- Active
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
  is_active = EXCLUDED.is_active;

-- Also add the notification preference column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'customer_booking_no_show_email'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN customer_booking_no_show_email BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_settings' AND column_name = 'customer_booking_no_show_sms'
  ) THEN
    ALTER TABLE user_settings ADD COLUMN customer_booking_no_show_sms BOOLEAN DEFAULT false;
  END IF;
END $$;

