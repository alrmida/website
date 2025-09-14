-- Create production summary tables for fast analytics
-- These tables will store pre-computed aggregations to avoid expensive real-time calculations

-- Daily production summary table
CREATE TABLE public.daily_production_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  date DATE NOT NULL,
  total_production_liters NUMERIC NOT NULL DEFAULT 0,
  production_events_count INTEGER NOT NULL DEFAULT 0,
  drainage_events_count INTEGER NOT NULL DEFAULT 0,
  -- Status breakdown (percentages)
  producing_percentage NUMERIC NOT NULL DEFAULT 0,
  idle_percentage NUMERIC NOT NULL DEFAULT 0,
  full_water_percentage NUMERIC NOT NULL DEFAULT 0,
  disconnected_percentage NUMERIC NOT NULL DEFAULT 0,
  -- Metadata
  first_event_time TIMESTAMP WITH TIME ZONE,
  last_event_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(machine_id, date)
);

-- Weekly production summary table
CREATE TABLE public.weekly_production_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  week_start DATE NOT NULL, -- Monday of the week
  week_year INTEGER NOT NULL, -- ISO week year
  week_number INTEGER NOT NULL, -- ISO week number
  total_production_liters NUMERIC NOT NULL DEFAULT 0,
  production_events_count INTEGER NOT NULL DEFAULT 0,
  drainage_events_count INTEGER NOT NULL DEFAULT 0,
  -- Status breakdown (averages)
  producing_percentage NUMERIC NOT NULL DEFAULT 0,
  idle_percentage NUMERIC NOT NULL DEFAULT 0,
  full_water_percentage NUMERIC NOT NULL DEFAULT 0,
  disconnected_percentage NUMERIC NOT NULL DEFAULT 0,
  -- Metadata
  first_event_time TIMESTAMP WITH TIME ZONE,
  last_event_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(machine_id, week_start)
);

-- Monthly production summary table
CREATE TABLE public.monthly_production_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  month_year DATE NOT NULL, -- First day of the month
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  total_production_liters NUMERIC NOT NULL DEFAULT 0,
  production_events_count INTEGER NOT NULL DEFAULT 0,
  drainage_events_count INTEGER NOT NULL DEFAULT 0,
  -- Status breakdown (averages)
  producing_percentage NUMERIC NOT NULL DEFAULT 0,
  idle_percentage NUMERIC NOT NULL DEFAULT 0,
  full_water_percentage NUMERIC NOT NULL DEFAULT 0,
  disconnected_percentage NUMERIC NOT NULL DEFAULT 0,
  -- Metadata
  first_event_time TIMESTAMP WITH TIME ZONE,
  last_event_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(machine_id, month_year)
);

-- Yearly production summary table
CREATE TABLE public.yearly_production_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL,
  year INTEGER NOT NULL,
  total_production_liters NUMERIC NOT NULL DEFAULT 0,
  production_events_count INTEGER NOT NULL DEFAULT 0,
  drainage_events_count INTEGER NOT NULL DEFAULT 0,
  -- Status breakdown (averages)
  producing_percentage NUMERIC NOT NULL DEFAULT 0,
  idle_percentage NUMERIC NOT NULL DEFAULT 0,
  full_water_percentage NUMERIC NOT NULL DEFAULT 0,
  disconnected_percentage NUMERIC NOT NULL DEFAULT 0,
  -- Metadata
  first_event_time TIMESTAMP WITH TIME ZONE,
  last_event_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(machine_id, year)
);

-- Machine total production tracking table
CREATE TABLE public.machine_production_totals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  machine_id TEXT NOT NULL UNIQUE,
  total_production_liters NUMERIC NOT NULL DEFAULT 0,
  last_production_event_id UUID,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for fast querying
CREATE INDEX idx_daily_production_machine_date ON public.daily_production_summary(machine_id, date DESC);
CREATE INDEX idx_weekly_production_machine_week ON public.weekly_production_summary(machine_id, week_start DESC);
CREATE INDEX idx_monthly_production_machine_month ON public.monthly_production_summary(machine_id, month_year DESC);
CREATE INDEX idx_yearly_production_machine_year ON public.yearly_production_summary(machine_id, year DESC);
CREATE INDEX idx_machine_totals_machine_id ON public.machine_production_totals(machine_id);

-- Enable RLS on all summary tables
ALTER TABLE public.daily_production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_production_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.machine_production_totals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_production_summary
CREATE POLICY "Clients can view their own machine daily production summary" 
ON public.daily_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM machines m 
  WHERE m.machine_id = daily_production_summary.machine_id 
    AND m.client_id = auth.uid() 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
));

CREATE POLICY "Allow admin and commercial users to view daily production summary" 
ON public.daily_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['kumulus_personnel', 'kumulus_admin'])
));

CREATE POLICY "Allow service role full access to daily production summary" 
ON public.daily_production_summary 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for weekly_production_summary
CREATE POLICY "Clients can view their own machine weekly production summary" 
ON public.weekly_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM machines m 
  WHERE m.machine_id = weekly_production_summary.machine_id 
    AND m.client_id = auth.uid() 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
));

CREATE POLICY "Allow admin and commercial users to view weekly production summary" 
ON public.weekly_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['kumulus_personnel', 'kumulus_admin'])
));

CREATE POLICY "Allow service role full access to weekly production summary" 
ON public.weekly_production_summary 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for monthly_production_summary
CREATE POLICY "Clients can view their own machine monthly production summary" 
ON public.monthly_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM machines m 
  WHERE m.machine_id = monthly_production_summary.machine_id 
    AND m.client_id = auth.uid() 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
));

CREATE POLICY "Allow admin and commercial users to view monthly production summary" 
ON public.monthly_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['kumulus_personnel', 'kumulus_admin'])
));

CREATE POLICY "Allow service role full access to monthly production summary" 
ON public.monthly_production_summary 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for yearly_production_summary
CREATE POLICY "Clients can view their own machine yearly production summary" 
ON public.yearly_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM machines m 
  WHERE m.machine_id = yearly_production_summary.machine_id 
    AND m.client_id = auth.uid() 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
));

CREATE POLICY "Allow admin and commercial users to view yearly production summary" 
ON public.yearly_production_summary 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['kumulus_personnel', 'kumulus_admin'])
));

CREATE POLICY "Allow service role full access to yearly production summary" 
ON public.yearly_production_summary 
FOR ALL 
USING (true)
WITH CHECK (true);

-- RLS Policies for machine_production_totals
CREATE POLICY "Clients can view their own machine production totals" 
ON public.machine_production_totals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM machines m 
  WHERE m.machine_id = machine_production_totals.machine_id 
    AND m.client_id = auth.uid() 
    AND EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'client')
));

CREATE POLICY "Allow admin and commercial users to view machine production totals" 
ON public.machine_production_totals 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
    AND profiles.role = ANY (ARRAY['kumulus_personnel', 'kumulus_admin'])
));

CREATE POLICY "Allow service role full access to machine production totals" 
ON public.machine_production_totals 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger function for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add updated_at triggers to all summary tables
CREATE TRIGGER update_daily_production_summary_updated_at
  BEFORE UPDATE ON public.daily_production_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_weekly_production_summary_updated_at
  BEFORE UPDATE ON public.weekly_production_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_production_summary_updated_at
  BEFORE UPDATE ON public.monthly_production_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_yearly_production_summary_updated_at
  BEFORE UPDATE ON public.yearly_production_summary
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_machine_production_totals_updated_at
  BEFORE UPDATE ON public.machine_production_totals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();