-- Create ingestion_failures table for tracking document processing issues
CREATE TABLE IF NOT EXISTS public.ingestion_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_details JSONB DEFAULT '{}'::jsonb,
  retry_count INTEGER DEFAULT 0,
  last_retry_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ingestion_failures ENABLE ROW LEVEL SECURITY;

-- Create policies for ingestion_failures
CREATE POLICY "Users can view their own ingestion failures"
  ON public.ingestion_failures
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ingestion failures"
  ON public.ingestion_failures
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingestion failures"
  ON public.ingestion_failures
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all ingestion failures"
  ON public.ingestion_failures
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ingestion_failures_user_id ON public.ingestion_failures(user_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_failures_document_id ON public.ingestion_failures(document_id);
CREATE INDEX IF NOT EXISTS idx_ingestion_failures_resolved ON public.ingestion_failures(resolved);

-- Add trigger for updated_at
CREATE TRIGGER update_ingestion_failures_updated_at
  BEFORE UPDATE ON public.ingestion_failures
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add ocr_required and ocr_attempted columns to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS ocr_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ocr_attempted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS ocr_completed BOOLEAN DEFAULT false;