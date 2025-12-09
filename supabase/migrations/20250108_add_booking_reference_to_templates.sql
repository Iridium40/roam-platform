-- Add booking reference number to all booking notification email templates
-- This helps users track their bookings across customer support interactions

-- Update customer_booking_accepted template
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  '<div class="info-label">Service:</div>',
  '<div class="info-label">Booking Reference:</div>
        <div class="info-value">{{booking_reference}}</div>
        
        <div class="info-label">Service:</div>'
)
WHERE template_key = 'customer_booking_accepted'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Update customer_booking_declined template
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  '<div class="info-label">Service:</div>',
  '<div class="info-label">Booking Reference:</div>
        <div class="info-value">{{booking_reference}}</div>
        
        <div class="info-label">Service:</div>'
)
WHERE template_key = 'customer_booking_declined'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Update customer_booking_completed template
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  '<div class="info-label">Service:</div>',
  '<div class="info-label">Booking Reference:</div>
        <div class="info-value">{{booking_reference}}</div>
        
        <div class="info-label">Service:</div>'
)
WHERE template_key = 'customer_booking_completed'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Update customer_booking_no_show template
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  '<div class="info-label">Service:</div>',
  '<div class="info-label">Booking Reference:</div>
        <div class="info-value">{{booking_reference}}</div>
        
        <div class="info-label">Service:</div>'
)
WHERE template_key = 'customer_booking_no_show'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Update provider_new_booking template
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'Booking ID:',
  'Booking Reference: {{booking_reference}}<br>Booking ID:'
)
WHERE template_key = 'provider_new_booking'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Update provider_booking_cancelled template
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'Booking ID:',
  'Booking Reference: {{booking_reference}}<br>Booking ID:'
)
WHERE template_key = 'provider_booking_cancelled'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Update provider_booking_rescheduled template
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'Booking ID:',
  'Booking Reference: {{booking_reference}}<br>Booking ID:'
)
WHERE template_key = 'provider_booking_rescheduled'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Add booking_reference to SMS templates as well
UPDATE public.notification_templates
SET sms_body = REPLACE(
  sms_body,
  'Booking ID:',
  'Ref: {{booking_reference}} | ID:'
)
WHERE template_key IN (
  'customer_booking_accepted',
  'customer_booking_declined',
  'customer_booking_completed',
  'customer_booking_no_show',
  'provider_new_booking',
  'provider_booking_cancelled',
  'provider_booking_rescheduled'
)
AND sms_body NOT LIKE '%booking_reference%';

-- Verify the updates
SELECT 
  template_key,
  template_name,
  CASE 
    WHEN email_body_html LIKE '%booking_reference%' THEN '✓ Email has reference'
    ELSE '✗ Email missing reference'
  END as email_status,
  CASE 
    WHEN sms_body LIKE '%booking_reference%' THEN '✓ SMS has reference'
    ELSE '✗ SMS missing reference'
  END as sms_status
FROM public.notification_templates
WHERE template_key IN (
  'customer_booking_accepted',
  'customer_booking_declined',
  'customer_booking_completed',
  'customer_booking_no_show',
  'provider_new_booking',
  'provider_booking_cancelled',
  'provider_booking_rescheduled'
)
ORDER BY template_key;

