-- Enable pgvector extension for vector embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Update document_embeddings to use vector type
ALTER TABLE document_embeddings 
ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx 
ON document_embeddings USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create entity_extractions table for PII/PHI detection
CREATE TABLE IF NOT EXISTS entity_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entity_type TEXT NOT NULL, -- 'pii', 'phi', 'financial', 'confidential'
  entity_category TEXT NOT NULL, -- 'email', 'ssn', 'credit_card', 'medical_record', etc.
  entity_value TEXT NOT NULL,
  location JSONB, -- {page: 1, line: 5, position: {start: 10, end: 25}}
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  masked_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS policies for entity_extractions
ALTER TABLE entity_extractions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own entity extractions"
  ON entity_extractions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create entity extractions for their documents"
  ON entity_extractions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM documents 
      WHERE documents.id = entity_extractions.document_id 
      AND documents.user_id = auth.uid()
    )
  );

-- Create integration_settings table for Slack/Teams
CREATE TABLE IF NOT EXISTS integration_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  integration_type TEXT NOT NULL, -- 'slack', 'teams', 'jira', 'servicenow'
  webhook_url TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_rules JSONB DEFAULT '{
    "on_critical": true,
    "on_high": true,
    "on_medium": false,
    "on_low": false,
    "min_score": 50
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, integration_type)
);

-- RLS for integration_settings
ALTER TABLE integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own integration settings"
  ON integration_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_integration_settings_updated_at
  BEFORE UPDATE ON integration_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create admin_metrics table for dashboard
CREATE TABLE IF NOT EXISTS admin_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type TEXT NOT NULL, -- 'documents_processed', 'risks_detected', 'queries_answered', etc.
  metric_value NUMERIC NOT NULL,
  time_period TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly'
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS for admin_metrics
ALTER TABLE admin_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all metrics"
  ON admin_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert metrics"
  ON admin_metrics FOR INSERT
  WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS entity_extractions_document_id_idx ON entity_extractions(document_id);
CREATE INDEX IF NOT EXISTS entity_extractions_user_id_idx ON entity_extractions(user_id);
CREATE INDEX IF NOT EXISTS entity_extractions_entity_type_idx ON entity_extractions(entity_type);
CREATE INDEX IF NOT EXISTS entity_extractions_severity_idx ON entity_extractions(severity);
CREATE INDEX IF NOT EXISTS admin_metrics_time_period_idx ON admin_metrics(time_period, period_start);
CREATE INDEX IF NOT EXISTS admin_metrics_metric_type_idx ON admin_metrics(metric_type);