-- Fix security definer view issue by dropping and recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.admin_compliance_metrics;

-- Create a regular view (not SECURITY DEFINER)
CREATE VIEW public.admin_compliance_metrics AS
SELECT 
    COUNT(DISTINCT d.id) as total_documents,
    COUNT(DISTINCT d.user_id) as total_users,
    COUNT(DISTINCT cr.id) as total_reports,
    ROUND(AVG(cr.compliance_score)::numeric, 2) as avg_compliance_score,
    COUNT(CASE WHEN cr.risk_level = 'CRITICAL' THEN 1 END) as critical_risks,
    COUNT(CASE WHEN cr.risk_level = 'HIGH' THEN 1 END) as high_risks,
    COUNT(CASE WHEN cr.risk_level = 'MEDIUM' THEN 1 END) as medium_risks,
    COUNT(CASE WHEN cr.risk_level = 'LOW' THEN 1 END) as low_risks,
    COUNT(CASE WHEN d.processing_status = 'completed' THEN 1 END) as completed_documents,
    COUNT(CASE WHEN d.processing_status = 'processing' THEN 1 END) as processing_documents,
    COUNT(CASE WHEN d.processing_status = 'failed' THEN 1 END) as failed_documents
FROM public.documents d
LEFT JOIN public.compliance_reports cr ON d.id = cr.document_id;

-- Grant access through RLS policies, not view ownership
GRANT SELECT ON public.admin_compliance_metrics TO authenticated;