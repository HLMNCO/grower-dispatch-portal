ALTER TABLE public.dispatches DROP CONSTRAINT dispatches_status_check;

ALTER TABLE public.dispatches ADD CONSTRAINT dispatches_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'in-transit'::text, 'arrived'::text, 'received'::text, 'received-pending-admin'::text, 'issue'::text]));