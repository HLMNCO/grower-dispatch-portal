
-- Add current_eta column to dispatches (only column truly missing)
ALTER TABLE public.dispatches ADD COLUMN IF NOT EXISTS current_eta time without time zone;
