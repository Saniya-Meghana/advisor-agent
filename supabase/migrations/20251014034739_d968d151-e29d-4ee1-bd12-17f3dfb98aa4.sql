-- Phase 1: Core Governance Foundation Tables

-- Deployment events table for tracking all deployment activities
CREATE TABLE IF NOT EXISTS public.deployment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('deploy', 'rollback', 'approve', 'reject', 'preview')),
  environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),
  config_data JSONB NOT NULL DEFAULT '{}',
  accuracy DECIMAL(5,4),
  latency_ms INTEGER,
  error_rate DECIMAL(5,4),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  checklist_completed BOOLEAN DEFAULT false,
  override_requested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Risk assessments table for deployment risk scoring
CREATE TABLE IF NOT EXISTS public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES public.deployment_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  config_fingerprint TEXT NOT NULL,
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_factors JSONB NOT NULL DEFAULT '[]',
  mitigation_steps JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Deployment checklist items
CREATE TABLE IF NOT EXISTS public.checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES public.deployment_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('security', 'testing', 'documentation', 'compliance', 'review')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Team metrics for leaderboard
CREATE TABLE IF NOT EXISTS public.team_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  deployments_count INTEGER DEFAULT 0,
  approvals_count INTEGER DEFAULT 0,
  rollbacks_count INTEGER DEFAULT 0,
  checklist_completed_count INTEGER DEFAULT 0,
  sandbox_runs_count INTEGER DEFAULT 0,
  governance_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.deployment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deployment_events
CREATE POLICY "Users can view their own deployment events"
  ON public.deployment_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deployment events"
  ON public.deployment_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all deployment events"
  ON public.deployment_events FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for risk_assessments
CREATE POLICY "Users can view their own risk assessments"
  ON public.risk_assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk assessments"
  ON public.risk_assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all risk assessments"
  ON public.risk_assessments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for checklist_items
CREATE POLICY "Users can manage their own checklist items"
  ON public.checklist_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all checklist items"
  ON public.checklist_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for team_metrics
CREATE POLICY "Users can view their own metrics"
  ON public.team_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all metrics"
  ON public.team_metrics FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can update metrics"
  ON public.team_metrics FOR ALL
  USING (true);

-- Indexes for performance
CREATE INDEX idx_deployment_events_user_id ON public.deployment_events(user_id);
CREATE INDEX idx_deployment_events_created_at ON public.deployment_events(created_at DESC);
CREATE INDEX idx_deployment_events_environment ON public.deployment_events(environment);
CREATE INDEX idx_risk_assessments_user_id ON public.risk_assessments(user_id);
CREATE INDEX idx_checklist_items_deployment_id ON public.checklist_items(deployment_id);
CREATE INDEX idx_team_metrics_user_id ON public.team_metrics(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_team_metrics_updated_at
  BEFORE UPDATE ON public.team_metrics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();