-- 1. Add transporter columns to dispatches
ALTER TABLE public.dispatches
  ADD COLUMN IF NOT EXISTS transporter_business_id uuid REFERENCES public.businesses(id),
  ADD COLUMN IF NOT EXISTS pickup_time timestamptz,
  ADD COLUMN IF NOT EXISTS temperature_reading numeric,
  ADD COLUMN IF NOT EXISTS transporter_notes text;

-- 2. Transporter RLS on dispatches: view assigned dispatches
CREATE POLICY "Transporters can view assigned dispatches"
  ON public.dispatches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = dispatches.transporter_business_id
        AND b.owner_id = auth.uid()
        AND b.business_type = 'transporter'
    )
  );

-- 3. Transporters can update assigned dispatches (enrich with logistics data, update status)
CREATE POLICY "Transporters can update assigned dispatches"
  ON public.dispatches FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = dispatches.transporter_business_id
        AND b.owner_id = auth.uid()
        AND b.business_type = 'transporter'
    )
  );

-- 4. Transporters can create dispatches on behalf of growers
CREATE POLICY "Transporters can create dispatches"
  ON public.dispatches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE b.id = dispatches.transporter_business_id
        AND b.owner_id = auth.uid()
        AND b.business_type = 'transporter'
    )
  );

-- 5. Transporters can view summary dispatch items (RLS still applies, but they get access)
CREATE POLICY "Transporters can view dispatch items"
  ON public.dispatch_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dispatches d
      JOIN public.businesses b ON b.id = d.transporter_business_id
      WHERE d.id = dispatch_items.dispatch_id
        AND b.owner_id = auth.uid()
        AND b.business_type = 'transporter'
    )
  );

-- 6. Transporters can create connections (to suppliers or receivers)
CREATE POLICY "Transporters can create connections"
  ON public.connections FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE (b.id = connections.supplier_business_id OR b.id = connections.receiver_business_id)
        AND b.owner_id = auth.uid()
        AND b.business_type = 'transporter'
    )
  );

-- 7. Transporters can view their connections
CREATE POLICY "Transporters can view connections"
  ON public.connections FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE (b.id = connections.supplier_business_id OR b.id = connections.receiver_business_id)
        AND b.owner_id = auth.uid()
        AND b.business_type = 'transporter'
    )
  );

-- 8. Transporters can update connections they receive (approve/reject)
CREATE POLICY "Transporters can update connections"
  ON public.connections FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.businesses b
      WHERE (b.id = connections.supplier_business_id OR b.id = connections.receiver_business_id)
        AND b.owner_id = auth.uid()
        AND b.business_type = 'transporter'
    )
  );