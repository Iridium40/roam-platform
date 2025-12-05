-- Update all notification templates to use absolute logo URL
-- This ensures logos display correctly in all environments (dev, staging, production)

-- Using the CDN logo URL that's already in use
-- Logo URL: https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200

UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'src="{{base_url}}/logo-email.png"',
  'src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200"'
)
WHERE email_body_html LIKE '%{{base_url}}/logo-email.png%';

-- Also handle any templates that might have hardcoded relative paths
UPDATE public.notification_templates
SET email_body_html = REPLACE(
  email_body_html,
  'src="/logo-email.png"',
  'src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200"'
)
WHERE email_body_html LIKE '%src="/logo-email.png"%';

-- Update any templates that reference localhost or vercel URLs
UPDATE public.notification_templates
SET email_body_html = REGEXP_REPLACE(
  email_body_html,
  'src="https?://[^"]+/logo-email\.png"',
  'src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2F993952d908754e5dbe0cceda03eb2224?format=webp&width=200"',
  'g'
)
WHERE email_body_html ~ 'src="https?://[^"]+/logo-email\.png"';

-- Verification query (comment out after running)
-- SELECT 
--   template_key,
--   CASE 
--     WHEN email_body_html LIKE '%cdn.builder.io%' THEN '✅ CDN logo'
--     WHEN email_body_html LIKE '%logo%' THEN '⚠️ Other logo reference'
--     ELSE '❌ No logo'
--   END as logo_status
-- FROM public.notification_templates
-- WHERE is_active = true;

