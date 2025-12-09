-- Update customer_booking_no_show template with:
-- 1. CDN logo URL (instead of old Supabase storage URL)
-- 2. Add booking_reference to variables list
-- 3. Add booking_reference to HTML template

-- Step 1: Update logo URL
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'src="https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/website-images/roam-logo-white.png"',
  'src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200"'
)
WHERE template_key = 'customer_booking_no_show';

-- Step 2: Add booking_reference to template HTML (after the warning box, before service)
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  '<div class="info-box">
        <div class="info-label">Service:</div>',
  '<div class="info-box">
        <div class="info-label">Booking Reference:</div>
        <div class="info-value">{{booking_reference}}</div>
        
        <div class="info-label">Service:</div>'
)
WHERE template_key = 'customer_booking_no_show'
  AND email_body_html NOT LIKE '%booking_reference%';

-- Step 3: Update variables list to include booking_reference
UPDATE public.notification_templates
SET variables = '["customer_name", "provider_name", "service_name", "booking_date", "booking_time", "booking_location", "total_amount", "booking_id", "booking_reference"]'::jsonb
WHERE template_key = 'customer_booking_no_show';

-- Step 4: Add booking_reference to SMS template
UPDATE public.notification_templates
SET sms_body = 'ROAM [Ref: {{booking_reference}}]: You missed your {{service_name}} appointment on {{booking_date}} at {{booking_time}}. This has been marked as a no-show. Contact support if this was an error.'
WHERE template_key = 'customer_booking_no_show';

-- Step 5: Update text email body to include booking reference
UPDATE public.notification_templates
SET email_body_text = REPLACE(
  email_body_text,
  'BOOKING DETAILS:
Service:',
  'BOOKING DETAILS:
Booking Reference: {{booking_reference}}
Service:'
)
WHERE template_key = 'customer_booking_no_show'
  AND email_body_text NOT LIKE '%Booking Reference:%';

-- Verify the update
SELECT 
  template_key,
  template_name,
  CASE 
    WHEN email_body_html LIKE '%booking_reference%' THEN '✓ Has reference'
    ELSE '✗ Missing reference'
  END as html_status,
  CASE 
    WHEN sms_body LIKE '%booking_reference%' THEN '✓ Has reference'
    ELSE '✗ Missing reference'
  END as sms_status,
  CASE 
    WHEN email_body_html LIKE '%cdn.builder.io%' THEN '✓ CDN logo'
    ELSE '✗ Old logo'
  END as logo_status
FROM public.notification_templates
WHERE template_key = 'customer_booking_no_show';

