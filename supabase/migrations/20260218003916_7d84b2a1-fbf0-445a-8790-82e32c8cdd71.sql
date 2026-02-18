
-- Drop the problematic recursive policy
DROP POLICY IF EXISTS "Users can view connected businesses" ON public.businesses;
DROP POLICY IF EXISTS "Receivers can view businesses dispatching to them" ON public.businesses;

-- Create a security definer function to check connections without recursion
CREATE OR REPLACE FUNCTION public.get_user_business_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM businesses WHERE owner_id = _user_id LIMIT 1
$$;

-- Users can see businesses they have approved connections with
CREATE POLICY "Users can view connected businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM connections c
    WHERE c.status = 'approved'
    AND (
      (c.supplier_business_id = get_user_business_id(auth.uid()) AND c.receiver_business_id = businesses.id)
      OR
      (c.receiver_business_id = get_user_business_id(auth.uid()) AND c.supplier_business_id = businesses.id)
    )
  )
);

-- Receivers can see businesses that dispatch to them (for public intake submissions)
CREATE POLICY "Receivers can view dispatching businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dispatches d
    WHERE d.receiver_business_id = get_user_business_id(auth.uid())
    AND d.supplier_business_id = businesses.id
  )
);
