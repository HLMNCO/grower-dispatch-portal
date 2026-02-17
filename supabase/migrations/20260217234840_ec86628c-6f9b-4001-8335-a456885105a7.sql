-- Add unit_weight column to dispatch_items (weight per individual unit/box)
-- The existing 'weight' column will become the auto-calculated total weight (qty * unit_weight)
ALTER TABLE public.dispatch_items ADD COLUMN unit_weight numeric DEFAULT NULL;

-- Add a comment for clarity
COMMENT ON COLUMN public.dispatch_items.unit_weight IS 'Weight per individual unit/box in kg';
COMMENT ON COLUMN public.dispatch_items.weight IS 'Total weight in kg (quantity * unit_weight)';