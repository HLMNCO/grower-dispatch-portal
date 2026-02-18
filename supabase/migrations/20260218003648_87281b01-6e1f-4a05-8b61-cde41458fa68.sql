
-- Drop the overly permissive "anyone can see all businesses" policy
DROP POLICY IF EXISTS "Authenticated users can view businesses" ON public.businesses;

-- Suppliers/transporters can see their OWN business
CREATE POLICY "Users can view own business"
ON public.businesses
FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Users can see businesses they are CONNECTED to (approved connections only)
CREATE POLICY "Users can view connected businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM connections c
    JOIN businesses my_biz ON my_biz.owner_id = auth.uid()
    WHERE c.status = 'approved'
    AND (
      -- I'm supplier, viewing the receiver I'm connected to
      (c.supplier_business_id = my_biz.id AND c.receiver_business_id = businesses.id)
      OR
      -- I'm receiver, viewing a supplier connected to me
      (c.receiver_business_id = my_biz.id AND c.supplier_business_id = businesses.id)
      OR
      -- Transporter connections
      (c.supplier_business_id = my_biz.id AND c.receiver_business_id = businesses.id)
      OR
      (c.receiver_business_id = my_biz.id AND c.supplier_business_id = businesses.id)
    )
  )
);

-- Staff can see all businesses (for admin/receiver staff)
CREATE POLICY "Staff can view all businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'));

-- Receivers can see businesses that have dispatches to them
-- (covers public intake submissions where there's no formal connection)
CREATE POLICY "Receivers can view businesses dispatching to them"
ON public.businesses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM dispatches d
    JOIN businesses recv ON recv.id = d.receiver_business_id AND recv.owner_id = auth.uid()
    WHERE d.supplier_business_id = businesses.id
  )
);
