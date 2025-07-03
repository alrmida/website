
-- Create table for comprehensive data ingestion logging
CREATE TABLE IF NOT EXISTS public.data_ingestion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  log_type TEXT NOT NULL, -- 'INFO', 'WARNING', 'ERROR', 'SUCCESS', 'EVENT'
  message TEXT NOT NULL,
  data_timestamp TIMESTAMP WITH TIME ZONE,
  data_freshness_minutes INTEGER,
  influx_query TEXT,
  influx_response_size INTEGER,
  error_details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_data_ingestion_logs_machine_time 
ON public.data_ingestion_logs(machine_id, created_at DESC);

-- Create index for log type filtering
CREATE INDEX IF NOT EXISTS idx_data_ingestion_logs_type_time 
ON public.data_ingestion_logs(log_type, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.data_ingestion_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow service role full access to ingestion logs" 
ON public.data_ingestion_logs 
FOR ALL 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Allow kumulus personnel to view ingestion logs" 
ON public.data_ingestion_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'kumulus_personnel'::user_role
));
