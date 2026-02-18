
-- Add split load flag to dispatches
ALTER TABLE public.dispatches ADD COLUMN is_split_load boolean NOT NULL DEFAULT false;

-- Add partially-received as a valid concept (status is text, no constraint needed)
-- We just need the column for tracking
COMMENT ON COLUMN public.dispatches.is_split_load IS 'Whether this consignment will arrive across multiple trucks/deliveries';
