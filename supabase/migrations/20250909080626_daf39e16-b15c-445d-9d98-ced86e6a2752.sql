-- Add role-based access control
CREATE TYPE public.app_role AS ENUM ('admin', 'auditor', 'analyst', 'viewer');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create audit_logs table
CREATE TABLE public.audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for audit_logs
CREATE POLICY "Users can view their own audit logs"
ON public.audit_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All authenticated users can create audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create regulation_templates table
CREATE TABLE public.regulation_templates (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    version TEXT NOT NULL DEFAULT '1.0',
    template_data JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on regulation_templates
ALTER TABLE public.regulation_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for regulation_templates
CREATE POLICY "All authenticated users can view active templates"
ON public.regulation_templates
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.regulation_templates
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info',
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_document_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.notifications
FOR INSERT
WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Add columns to documents table for enhanced metadata
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS retention_policy_days INTEGER DEFAULT 2555, -- 7 years default
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS source_system TEXT;

-- Add columns to compliance_reports for enhanced scoring
ALTER TABLE public.compliance_reports
ADD COLUMN IF NOT EXISTS regulation_template_id UUID,
ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'gpt-4o-mini',
ADD COLUMN IF NOT EXISTS model_version TEXT DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS evidence_chunks JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS clause_scores JSONB DEFAULT '{}'::jsonb;

-- Create triggers for updated_at columns
CREATE TRIGGER update_user_roles_updated_at
    BEFORE UPDATE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_regulation_templates_updated_at
    BEFORE UPDATE ON public.regulation_templates
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default regulation templates
INSERT INTO public.regulation_templates (name, description, template_data, created_by) VALUES
('GDPR Compliance', 'General Data Protection Regulation compliance checklist', '{
  "clauses": [
    {"name": "Data Processing Basis", "required": true, "weight": 0.2},
    {"name": "Consent Management", "required": true, "weight": 0.15},
    {"name": "Right to Erasure", "required": true, "weight": 0.15},
    {"name": "Data Breach Notification", "required": true, "weight": 0.15},
    {"name": "Privacy by Design", "required": true, "weight": 0.1},
    {"name": "Data Protection Officer", "required": false, "weight": 0.1},
    {"name": "Cross-border Transfer", "required": true, "weight": 0.15}
  ],
  "risk_thresholds": {"low": 70, "medium": 40, "high": 0}
}', (SELECT auth.uid())),
('HIPAA Compliance', 'Health Insurance Portability and Accountability Act compliance', '{
  "clauses": [
    {"name": "Administrative Safeguards", "required": true, "weight": 0.25},
    {"name": "Physical Safeguards", "required": true, "weight": 0.25},
    {"name": "Technical Safeguards", "required": true, "weight": 0.25},
    {"name": "Business Associate Agreements", "required": true, "weight": 0.15},
    {"name": "Breach Notification", "required": true, "weight": 0.1}
  ],
  "risk_thresholds": {"low": 80, "medium": 50, "high": 0}
}', (SELECT auth.uid())),
('ISO 27001', 'Information Security Management System standard', '{
  "clauses": [
    {"name": "Information Security Policy", "required": true, "weight": 0.15},
    {"name": "Risk Management", "required": true, "weight": 0.2},
    {"name": "Access Control", "required": true, "weight": 0.2},
    {"name": "Cryptography", "required": true, "weight": 0.15},
    {"name": "Incident Management", "required": true, "weight": 0.15},
    {"name": "Business Continuity", "required": true, "weight": 0.15}
  ],
  "risk_thresholds": {"low": 75, "medium": 45, "high": 0}
}', (SELECT auth.uid()));

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_user_id UUID,
    p_action TEXT,
    p_resource_type TEXT,
    p_resource_id UUID DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_logs (user_id, action, resource_type, resource_id, details)
    VALUES (p_user_id, p_action, p_resource_type, p_resource_id, p_details);
END;
$$;