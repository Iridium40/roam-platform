-- Create business approvals view for admin verification page
-- Pre-aggregates document counts for each business for better performance

CREATE OR REPLACE VIEW admin_business_approvals_view AS
SELECT
  bp.id,
  bp.business_name,
  bp.contact_email,
  bp.phone,
  bp.verification_status,
  bp.stripe_account_id,
  bp.is_active,
  bp.created_at,
  bp.image_url,
  bp.website_url,
  bp.logo_url,
  bp.cover_image_url,
  bp.business_hours,
  bp.social_media,
  bp.verification_notes,
  bp.business_type,
  bp.setup_completed,
  bp.setup_step,
  bp.is_featured,
  bp.identity_verified,
  bp.identity_verified_at,
  bp.bank_connected,
  bp.bank_connected_at,
  bp.application_submitted_at,
  bp.approved_at,
  bp.approved_by,
  bp.approval_notes,
  bp.business_description,
  
  -- Document counts aggregated from business_documents
  COALESCE(doc_stats.total_documents, 0) AS total_documents,
  COALESCE(doc_stats.verified_documents, 0) AS verified_documents,
  COALESCE(doc_stats.pending_documents, 0) AS pending_documents,
  COALESCE(doc_stats.rejected_documents, 0) AS rejected_documents,
  COALESCE(doc_stats.under_review_documents, 0) AS under_review_documents,
  
  -- Verification progress percentage
  CASE 
    WHEN COALESCE(doc_stats.total_documents, 0) = 0 THEN 0
    ELSE ROUND((COALESCE(doc_stats.verified_documents, 0)::numeric / doc_stats.total_documents::numeric) * 100, 0)
  END AS verification_progress,
  
  -- Priority flag for businesses needing attention
  CASE
    WHEN bp.verification_status = 'pending' THEN true
    WHEN bp.verification_status = 'suspended' THEN true
    ELSE false
  END AS requires_attention,
  
  -- Days since application submitted
  CASE
    WHEN bp.application_submitted_at IS NOT NULL 
    THEN EXTRACT(DAY FROM (CURRENT_TIMESTAMP - bp.application_submitted_at))
    ELSE EXTRACT(DAY FROM (CURRENT_TIMESTAMP - bp.created_at))
  END AS days_pending

FROM business_profiles bp
LEFT JOIN (
  SELECT 
    business_id,
    COUNT(*) AS total_documents,
    COUNT(*) FILTER (WHERE verification_status = 'verified') AS verified_documents,
    COUNT(*) FILTER (WHERE verification_status = 'pending') AS pending_documents,
    COUNT(*) FILTER (WHERE verification_status = 'rejected') AS rejected_documents,
    COUNT(*) FILTER (WHERE verification_status = 'under_review') AS under_review_documents
  FROM business_documents
  GROUP BY business_id
) doc_stats ON bp.id = doc_stats.business_id;

-- Add comment
COMMENT ON VIEW admin_business_approvals_view IS 
'Optimized view for business approvals page with pre-aggregated document counts. Eliminates N+1 queries and client-side aggregation.';

-- Grant access
GRANT SELECT ON admin_business_approvals_view TO authenticated;
GRANT SELECT ON admin_business_approvals_view TO service_role;

-- Create indexes on underlying table for better view performance
CREATE INDEX IF NOT EXISTS idx_business_documents_business_id_status 
  ON business_documents(business_id, verification_status);

CREATE INDEX IF NOT EXISTS idx_business_profiles_verification_status_created 
  ON business_profiles(verification_status, created_at DESC);

