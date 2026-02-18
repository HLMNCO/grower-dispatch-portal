
-- ============================================
-- PART 1A: Add new columns to dispatches
-- ============================================

-- Rename con_note_number to transporter_con_note_number
ALTER TABLE public.dispatches RENAME COLUMN con_note_number TO transporter_con_note_number;

-- Add new columns
ALTER TABLE public.dispatches
  ADD COLUMN transporter_con_note_photo_url text,
  ADD COLUMN delivery_advice_number text UNIQUE,
  ADD COLUMN delivery_advice_generated_at timestamptz,
  ADD COLUMN qr_code_token uuid DEFAULT gen_random_uuid(),
  ADD COLUMN estimated_arrival_window_start time,
  ADD COLUMN estimated_arrival_window_end time,
  ADD COLUMN temperature_zone text,
  ADD COLUMN commodity_class text;

-- Create index on qr_code_token for QR scan lookups
CREATE UNIQUE INDEX idx_dispatches_qr_code_token ON public.dispatches(qr_code_token);

-- Create index on delivery_advice_number
CREATE INDEX idx_dispatches_da_number ON public.dispatches(delivery_advice_number);

-- Create sequence for DA numbers per grower code
CREATE SEQUENCE IF NOT EXISTS da_sequence START 1;

-- Function to generate DA number
CREATE OR REPLACE FUNCTION public.generate_delivery_advice_number(p_dispatch_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_grower_code text;
  v_year text;
  v_seq int;
  v_da_number text;
BEGIN
  SELECT COALESCE(grower_code, 'NOCODE') INTO v_grower_code
  FROM dispatches WHERE id = p_dispatch_id;

  v_year := extract(year from now())::text;
  v_seq := nextval('da_sequence');
  v_da_number := 'DA-' || v_year || '-' || v_grower_code || '-' || lpad(v_seq::text, 5, '0');

  UPDATE dispatches
  SET delivery_advice_number = v_da_number,
      delivery_advice_generated_at = now()
  WHERE id = p_dispatch_id;

  RETURN v_da_number;
END;
$$;

-- ============================================
-- PART 1B: Create dispatch_events table
-- ============================================

CREATE TABLE public.dispatch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  triggered_by_user_id uuid REFERENCES auth.users(id),
  triggered_by_role text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_dispatch_events_dispatch_id ON public.dispatch_events(dispatch_id);
CREATE INDEX idx_dispatch_events_created_at ON public.dispatch_events(created_at);

-- Enable RLS
ALTER TABLE public.dispatch_events ENABLE ROW LEVEL SECURITY;

-- RLS: Suppliers can read events on their own dispatches
CREATE POLICY "Suppliers can view dispatch events"
ON public.dispatch_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM dispatches d
  WHERE d.id = dispatch_events.dispatch_id
    AND d.supplier_id = auth.uid()
));

-- RLS: Receivers can read events on dispatches sent to their business
CREATE POLICY "Receivers can view dispatch events"
ON public.dispatch_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM dispatches d
  JOIN businesses b ON b.id = d.receiver_business_id
  WHERE d.id = dispatch_events.dispatch_id
    AND b.owner_id = auth.uid()
));

-- RLS: Transporters can read events on dispatches assigned to them
CREATE POLICY "Transporters can view dispatch events"
ON public.dispatch_events FOR SELECT
USING (EXISTS (
  SELECT 1 FROM dispatches d
  JOIN businesses b ON b.id = d.transporter_business_id
  WHERE d.id = dispatch_events.dispatch_id
    AND b.owner_id = auth.uid()
    AND b.business_type = 'transporter'
));

-- RLS: All authenticated users can insert events
CREATE POLICY "Authenticated users can insert events"
ON public.dispatch_events FOR INSERT
TO authenticated
WITH CHECK (true);

-- Enable realtime for dispatch_events
ALTER PUBLICATION supabase_realtime ADD TABLE public.dispatch_events;

-- ============================================
-- PART 1C: Create dispatch_templates table
-- ============================================

CREATE TABLE public.dispatch_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses(id),
  template_name text NOT NULL,
  receiver_business_id uuid REFERENCES public.businesses(id),
  template_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

CREATE INDEX idx_dispatch_templates_business ON public.dispatch_templates(business_id);

-- Enable RLS
ALTER TABLE public.dispatch_templates ENABLE ROW LEVEL SECURITY;

-- RLS: Suppliers can read their own templates
CREATE POLICY "Suppliers can view own templates"
ON public.dispatch_templates FOR SELECT
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = dispatch_templates.business_id
    AND b.owner_id = auth.uid()
));

-- RLS: Suppliers can create templates
CREATE POLICY "Suppliers can create templates"
ON public.dispatch_templates FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = dispatch_templates.business_id
    AND b.owner_id = auth.uid()
));

-- RLS: Suppliers can update own templates
CREATE POLICY "Suppliers can update own templates"
ON public.dispatch_templates FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = dispatch_templates.business_id
    AND b.owner_id = auth.uid()
));

-- RLS: Suppliers can delete own templates
CREATE POLICY "Suppliers can delete own templates"
ON public.dispatch_templates FOR DELETE
USING (EXISTS (
  SELECT 1 FROM businesses b
  WHERE b.id = dispatch_templates.business_id
    AND b.owner_id = auth.uid()
));

-- ============================================
-- Storage bucket for con note photos
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('con-note-photos', 'con-note-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for con-note-photos
CREATE POLICY "Anyone can view con note photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'con-note-photos');

CREATE POLICY "Authenticated users can upload con note photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'con-note-photos');
