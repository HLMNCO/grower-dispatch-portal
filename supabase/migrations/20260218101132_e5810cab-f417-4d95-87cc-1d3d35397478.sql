
-- Create enum for staff positions
CREATE TYPE public.staff_position AS ENUM ('admin', 'warehouse_manager', 'operations', 'forklift_driver', 'dock_hand');

-- Create staff_positions table
CREATE TABLE public.staff_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  position staff_position NOT NULL DEFAULT 'dock_hand',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_positions ENABLE ROW LEVEL SECURITY;

-- Users can view their own position
CREATE POLICY "Users can view own position"
  ON public.staff_positions FOR SELECT
  USING (auth.uid() = user_id);

-- Staff can view all positions
CREATE POLICY "Staff can view all positions"
  ON public.staff_positions FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role));

-- Only admins can insert/update positions
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_positions
    WHERE user_id = _user_id AND position = 'admin'
  )
$$;

CREATE POLICY "Admins can insert positions"
  ON public.staff_positions FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update positions"
  ON public.staff_positions FOR UPDATE
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_staff_positions_updated_at
  BEFORE UPDATE ON public.staff_positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Set your admin position
INSERT INTO public.staff_positions (user_id, position)
VALUES ('7bceb39a-9415-4e6a-9bb2-38a57d2361d9', 'admin');
