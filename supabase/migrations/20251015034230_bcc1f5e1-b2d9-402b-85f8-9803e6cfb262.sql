-- Create deployment_events table
CREATE TABLE public.deployment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  description text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.deployment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own deployment events" ON public.deployment_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own deployment events" ON public.deployment_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_deployment_events_user_created ON public.deployment_events(user_id, created_at DESC);

-- Create risk_assessments table
CREATE TABLE public.risk_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assessment_name text NOT NULL,
  overall_risk_score integer NOT NULL,
  risk_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  mitigation_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own risk assessments" ON public.risk_assessments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own risk assessments" ON public.risk_assessments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own risk assessments" ON public.risk_assessments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own risk assessments" ON public.risk_assessments
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_risk_assessments_updated_at
  BEFORE UPDATE ON public.risk_assessments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  title text NOT NULL,
  description text,
  is_completed boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'medium',
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own checklist items" ON public.checklist_items
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checklist items" ON public.checklist_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklist items" ON public.checklist_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklist items" ON public.checklist_items
  FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_checklist_items_updated_at
  BEFORE UPDATE ON public.checklist_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_checklist_items_user_category ON public.checklist_items(user_id, category);

-- Create team_metrics table
CREATE TABLE public.team_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  period_start timestamp with time zone NOT NULL,
  period_end timestamp with time zone NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.team_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own team metrics" ON public.team_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own team metrics" ON public.team_metrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_team_metrics_user_type_period ON public.team_metrics(user_id, metric_type, period_end DESC);