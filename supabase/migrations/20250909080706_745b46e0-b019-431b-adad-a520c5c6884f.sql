-- Fix the migration - make created_by nullable for system templates
ALTER TABLE public.regulation_templates ALTER COLUMN created_by DROP NOT NULL;

-- Insert default regulation templates with NULL created_by (system templates)
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
}', NULL),
('HIPAA Compliance', 'Health Insurance Portability and Accountability Act compliance', '{
  "clauses": [
    {"name": "Administrative Safeguards", "required": true, "weight": 0.25},
    {"name": "Physical Safeguards", "required": true, "weight": 0.25},
    {"name": "Technical Safeguards", "required": true, "weight": 0.25},
    {"name": "Business Associate Agreements", "required": true, "weight": 0.15},
    {"name": "Breach Notification", "required": true, "weight": 0.1}
  ],
  "risk_thresholds": {"low": 80, "medium": 50, "high": 0}
}', NULL),
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
}', NULL),
('SOC 2 Type II', 'Service Organization Control 2 compliance framework', '{
  "clauses": [
    {"name": "Security", "required": true, "weight": 0.3},
    {"name": "Availability", "required": true, "weight": 0.2},
    {"name": "Processing Integrity", "required": true, "weight": 0.2},
    {"name": "Confidentiality", "required": false, "weight": 0.15},
    {"name": "Privacy", "required": false, "weight": 0.15}
  ],
  "risk_thresholds": {"low": 85, "medium": 60, "high": 0}
}', NULL);