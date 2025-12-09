-- Update customer_booking_no_show template logo URL
-- Note: booking_reference is added via 20250108_add_booking_reference_to_templates.sql
-- This migration ONLY handles the logo fix

-- Update logo URL from old Supabase storage to CDN
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'src="https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/website-images/roam-logo-white.png"',
  'src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200"'
)
WHERE template_key = 'customer_booking_no_show';

-- Verify the logo update
SELECT 
  template_key,
  template_name,
  CASE 
    WHEN email_body_html LIKE '%cdn.builder.io%' THEN '✓ CDN logo'
    ELSE '✗ Old logo'
  END as logo_status
FROM public.notification_templates
WHERE template_key = 'customer_booking_no_show';

