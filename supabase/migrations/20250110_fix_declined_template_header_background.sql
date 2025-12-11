-- Fix customer_booking_declined template header background
-- Change from dark blue (#2C5F7D) to light/white background like other email templates

UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  '.header { background-color: #2C5F7D; padding: 30px 20px; text-align: center; }',
  '.header { background-color: #f5f5f5; padding: 30px 20px; text-align: center; }'
)
WHERE template_key = 'customer_booking_declined'
  AND email_body_html LIKE '%background-color: #2C5F7D%';

-- Verify the update
SELECT 
  template_key,
  template_name,
  CASE 
    WHEN email_body_html LIKE '%background-color: #f5f5f5%' THEN 'Header background updated ✓'
    WHEN email_body_html LIKE '%background-color: #2C5F7D%' THEN 'Header background NOT updated ✗'
    ELSE 'Header background check inconclusive'
  END as header_status
FROM public.notification_templates
WHERE template_key = 'customer_booking_declined';
