-- Add internal lot number to dispatches (one per dispatch, flexible timing)
ALTER TABLE public.dispatches 
ADD COLUMN internal_lot_number text DEFAULT NULL;

-- Add received_quantity to dispatch_items for stock validation
ALTER TABLE public.dispatch_items 
ADD COLUMN received_quantity integer DEFAULT NULL;
