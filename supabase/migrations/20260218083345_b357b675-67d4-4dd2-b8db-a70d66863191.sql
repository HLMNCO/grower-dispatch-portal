
-- Add requested_role to staff_requests so admin knows what to approve
ALTER TABLE public.staff_requests ADD COLUMN requested_role text NOT NULL DEFAULT 'staff';

-- Disable auto-role assignment — roles now assigned on admin approval
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Roles are now assigned via admin approval, not automatically
  RETURN NEW;
END;
$$;

-- Allow staff to insert user roles (needed for approval flow)
CREATE POLICY "Staff can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'staff'::app_role));

-- Allow staff to update profiles (needed to finalize supplier details on approval)
CREATE POLICY "Staff can update profiles"
  ON public.profiles FOR UPDATE
  USING (has_role(auth.uid(), 'staff'::app_role));
