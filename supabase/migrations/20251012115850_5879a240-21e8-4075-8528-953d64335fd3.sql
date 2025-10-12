-- Add regulatory framework mapping columns to compliance_reports
ALTER TABLE public.compliance_reports 
ADD COLUMN IF NOT EXISTS regulatory_frameworks JSONB DEFAULT '[]'::jsonb;

-- Add comment for clarity
COMMENT ON COLUMN public.compliance_reports.regulatory_frameworks IS 'Array of regulatory frameworks mapped to this report (e.g., GDPR, HIPAA, SOX, CCPA)';

-- Create index for faster queries on regulatory frameworks
CREATE INDEX IF NOT EXISTS idx_compliance_reports_regulatory_frameworks 
ON public.compliance_reports USING GIN (regulatory_frameworks);

-- Add scheduled reanalysis tracking
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS last_reanalysis_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reanalysis_frequency_days INTEGER DEFAULT 30;

-- Add admin metrics view
CREATE OR REPLACE VIEW public.admin_compliance_metrics AS
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

-- Grant access to admin metrics view for admins only
ALTER VIEW public.admin_compliance_metrics OWNER TO postgres;
GRANT SELECT ON public.admin_compliance_metrics TO authenticated;

-- Create RLS policy for admin metrics view
CREATE POLICY "Admins can view compliance metrics"
ON public.compliance_reports
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add regulatory framework tracking table
CREATE TABLE IF NOT EXISTS public.regulatory_frameworks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    clauses JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on regulatory frameworks
ALTER TABLE public.regulatory_frameworks ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulatory frameworks
CREATE POLICY "All authenticated users can view active frameworks"
ON public.regulatory_frameworks
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "Admins can manage frameworks"
ON public.regulatory_frameworks
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Insert default regulatory frameworks
INSERT INTO public.regulatory_frameworks (name, description, version, clauses)
VALUES 
    ('GDPR', 'General Data Protection Regulation - EU data protection and privacy law', '1.0', 
     '[{"id": "art6", "title": "Lawfulness of processing"}, {"id": "art7", "title": "Conditions for consent"}, {"id": "art25", "title": "Data protection by design and by default"}]'::jsonb),
    ('HIPAA', 'Health Insurance Portability and Accountability Act - US healthcare data privacy', '1.0',
     '[{"id": "164.502", "title": "Uses and disclosures of protected health information"}, {"id": "164.308", "title": "Administrative safeguards"}]'::jsonb),
    ('SOX', 'Sarbanes-Oxley Act - US financial record keeping and reporting', '1.0',
     '[{"id": "section302", "title": "Corporate responsibility for financial reports"}, {"id": "section404", "title": "Management assessment of internal controls"}]'::jsonb),
    ('CCPA', 'California Consumer Privacy Act - California data privacy law', '1.0',
     '[{"id": "1798.100", "title": "Right to know"}, {"id": "1798.105", "title": "Right to delete"}]'::jsonb)
ON CONFLICT (name) DO NOTHING;

-- Add update trigger for timestamps
CREATE TRIGGER update_regulatory_frameworks_updated_at
BEFORE UPDATE ON public.regulatory_frameworks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();