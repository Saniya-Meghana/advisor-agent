-- Add missing columns to compliance_reports table
ALTER TABLE public.compliance_reports
ADD COLUMN IF NOT EXISTS model_name TEXT,
ADD COLUMN IF NOT EXISTS model_version TEXT;

-- Remove ip_address column from audit_logs if it exists (it shouldn't be there)
-- No need to add it as the audit logger will be fixed to not use it