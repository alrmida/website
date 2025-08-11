
-- Add ingestion_source column to raw_machine_data table
ALTER TABLE public.raw_machine_data 
ADD COLUMN ingestion_source text NOT NULL DEFAULT 'telemetry';

-- Add index for better performance when filtering by ingestion_source
CREATE INDEX idx_raw_machine_data_ingestion_source ON public.raw_machine_data(ingestion_source);

-- Add composite index for machine_id + ingestion_source + timestamp for efficient queries
CREATE INDEX idx_raw_machine_data_machine_source_time ON public.raw_machine_data(machine_id, ingestion_source, timestamp_utc DESC);
