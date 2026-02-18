
-- Table to store short intake links with pre-filled grower data
CREATE TABLE public.supplier_intake_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  short_code TEXT NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text, '-', ''), 1, 6),
  intake_token TEXT NOT NULL,
  grower_name TEXT NOT NULL,
  grower_code TEXT,
  grower_email TEXT,
  grower_phone TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_supplier_intake_links_short_code ON public.supplier_intake_links(short_code);

-- RLS
ALTER TABLE public.supplier_intake_links ENABLE ROW LEVEL SECURITY;

-- Authenticated users can create links
CREATE POLICY "Users can create intake links"
  ON public.supplier_intake_links FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Authenticated users can view their own links
CREATE POLICY "Users can view own intake links"
  ON public.supplier_intake_links FOR SELECT
  USING (auth.uid() = created_by);

-- Anonymous users can read by short_code (for redirect)
CREATE POLICY "Anyone can read by short code"
  ON public.supplier_intake_links FOR SELECT
  USING (true);
