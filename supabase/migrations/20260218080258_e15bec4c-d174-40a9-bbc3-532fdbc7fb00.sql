
-- Add receiving-specific fields to dispatches
ALTER TABLE public.dispatches ADD COLUMN receiving_temperature numeric NULL;
ALTER TABLE public.dispatches ADD COLUMN receiving_photos text[] NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.dispatches.receiving_temperature IS 'Temperature reading taken at inbound receiving';
COMMENT ON COLUMN public.dispatches.receiving_photos IS 'Photos taken during inbound receiving';
