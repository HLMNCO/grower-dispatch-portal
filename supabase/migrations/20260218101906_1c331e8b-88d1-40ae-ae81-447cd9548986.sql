
-- Allow staff to update any business (for editing grower details)
CREATE POLICY "Staff can update businesses"
  ON public.businesses FOR UPDATE
  USING (has_role(auth.uid(), 'staff'::app_role));

-- Allow admins to upsert staff positions
CREATE POLICY "Admins can upsert positions"
  ON public.staff_positions FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid())
    OR auth.uid() = user_id  -- allow self-insert during initial setup
  );
