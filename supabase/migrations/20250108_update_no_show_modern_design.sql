-- Update customer_booking_no_show template to match modern email design
-- Change from blue header banner to clean white background like other notifications

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
    .booking-card {
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
    .detail-row:last-child {
      border-bottom: none;
    }
    .alert-danger {
      background-color: #fee2e2;
      border: 1px solid #fecaca;
      border-left: 4px solid #ef4444;
      padding: 15px;
      margin: 20px 0;
      border-radius: 8px;
      color: #991b1b;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 14px;
      color: #6b7280;
      text-align: center;
    }
    h1 {
      color: #dc2626;
      font-size: 28px;
      margin-bottom: 20px;
    }
    h2, h3 {
      color: #4F46E5;
    }
    a {
      color: #4F46E5;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    strong {
      color: #1f2937;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="logo">
      <img src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200" alt="ROAM - Your Best Life. Everywhere." />
    </div>
    <div class="content">
      <h1>⚠️ Missed Appointment</h1>
      <p>Hi {{customer_name}},</p>
      <p>We noticed you didn''t arrive for your scheduled appointment. Your booking has been marked as a no-show.</p>
      
      <div class="booking-card">
        <h3 style="margin-top: 0; color: #92400e;">📋 Booking Details</h3>
        <div class="detail-row">
          <span><strong>Booking Reference:</strong></span>
          <span>{{booking_reference}}</span>
        </div>
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
      
      <div class="alert-danger">
        <p style="margin: 0;"><strong>⚠️ Important:</strong> As per our cancellation policy, the full booking amount of <strong>${{total_amount}}</strong> has been charged. No-shows are not eligible for refunds.</p>
      </div>
      
      <p>If you believe this was a mistake or there were extenuating circumstances, please contact our support team as soon as possible.</p>
      
      <p style="text-align: center;">
        <a href="https://roamyourbestlife.com/my-bookings" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0;">View My Bookings</a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
      
      <h3>💡 Tips to Avoid Future No-Shows:</h3>
      <ul style="color: #4b5563; line-height: 1.8;">
        <li>Set a reminder for your appointment</li>
        <li>Cancel at least 24 hours in advance if you can''t make it</li>
        <li>Contact the provider if you''re running late</li>
        <li>Add appointments to your calendar</li>
      </ul>
    </div>
    
    <div class="footer">
      <p style="margin: 0 0 10px 0;"><strong>ROAM - Your Best Life. Everywhere.</strong></p>
      <p style="margin: 0 0 10px 0;">
        Need help? Contact us at 
        <a href="mailto:support@roamyourbestlife.com" style="color: #4F46E5;">support@roamyourbestlife.com</a>
      </p>
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        © 2024 ROAM. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>'
WHERE template_key = 'customer_booking_no_show';

-- Verify the update
SELECT 
  template_key,
  template_name,
  CASE 
    WHEN email_body_html LIKE '%email-container%' THEN '✓ Modern design'
    ELSE '✗ Old design'
  END as design_status,
  CASE 
    WHEN email_body_html LIKE '%cdn.builder.io%' THEN '✓ CDN logo'
    ELSE '✗ Old logo'
  END as logo_status,
  CASE 
    WHEN email_body_html LIKE '%booking_reference%' THEN '✓ Has reference'
    ELSE '✗ Missing reference'
  END as reference_status
FROM public.notification_templates
WHERE template_key = 'customer_booking_no_show';

