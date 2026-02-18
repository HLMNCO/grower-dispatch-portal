
-- Allow staff to update dispatch items (received_quantity)
CREATE POLICY "Staff can update dispatch items"
ON public.dispatch_items
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role));

-- Update status constraint to include all valid statuses
ALTER TABLE public.dispatches DROP CONSTRAINT IF EXISTS dispatches_status_check;
ALTER TABLE public.dispatches ADD CONSTRAINT dispatches_status_check
  CHECK (status = ANY (ARRAY['pending'::text, 'in-transit'::text, 'arrived'::text, 'received'::text, 'received-pending-admin'::text, 'issue'::text]));
