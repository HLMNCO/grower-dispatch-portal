
-- Drop the dispatching businesses policy (causes recursion via dispatches → businesses)
DROP POLICY IF EXISTS "Receivers can view dispatching businesses" ON public.businesses;

-- The "connected businesses" policy also causes recursion because connections policies reference businesses
DROP POLICY IF EXISTS "Users can view connected businesses" ON public.businesses;

-- Simpler approach: use security definer function to get connected business IDs
CREATE OR REPLACE FUNCTION public.get_visible_business_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Own business
  SELECT id FROM businesses WHERE owner_id = _user_id
  UNION
  -- Connected businesses (approved)
  SELECT CASE 
    WHEN c.supplier_business_id = b.id THEN c.receiver_business_id
    ELSE c.supplier_business_id
  END
  FROM connections c
  JOIN businesses b ON b.owner_id = _user_id
  WHERE c.status = 'approved'
  AND (c.supplier_business_id = b.id OR c.receiver_business_id = b.id)
  UNION
  -- Businesses that dispatch to my business (covers public intake)
  SELECT d.supplier_business_id
  FROM dispatches d
  JOIN businesses b ON b.owner_id = _user_id AND b.id = d.receiver_business_id
  WHERE d.supplier_business_id IS NOT NULL
$$;

-- Single non-recursive policy
CREATE POLICY "Users can view visible businesses"
ON public.businesses
FOR SELECT
TO authenticated
USING (id IN (SELECT get_visible_business_ids(auth.uid())));
