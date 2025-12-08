-- Fix logo URL in customer_booking_declined template
-- Update from Supabase storage URL to CDN URL

UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'src="https://vssomyuyhicaxsgiaupo.supabase.co/storage/v1/object/public/website-images/roam-logo-white.png"',
  'src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200"'
)
WHERE template_key = 'customer_booking_declined'
  AND email_body_html LIKE '%vssomyuyhicaxsgiaupo.supabase.co%';

-- Verify the update
SELECT 
  template_key,
  template_name,
  CASE 
    WHEN email_body_html LIKE '%cdn.builder.io%' THEN 'Logo URL updated ✓'
    ELSE 'Logo URL NOT updated ✗'
  END as logo_status
FROM public.notification_templates
WHERE template_key = 'customer_booking_declined';

