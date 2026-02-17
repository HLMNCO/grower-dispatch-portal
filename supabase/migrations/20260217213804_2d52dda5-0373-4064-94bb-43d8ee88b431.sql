
-- Businesses table (both receivers and suppliers register their business)
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  business_type TEXT NOT NULL CHECK (business_type IN ('receiver', 'supplier')),
  abn TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  phone TEXT,
  email TEXT,
  grower_code TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Everyone can see businesses (needed for supplier search)
CREATE POLICY "Authenticated users can view businesses" ON public.businesses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can update own business" ON public.businesses FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated can create business" ON public.businesses FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);

-- Add business_id to profiles
ALTER TABLE public.profiles ADD COLUMN business_id UUID REFERENCES public.businesses(id);

-- Connections between suppliers and receivers
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  receiver_business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  UNIQUE (supplier_business_id, receiver_business_id)
);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Both parties can view their connections
CREATE POLICY "Parties can view connections" ON public.connections FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id IN (supplier_business_id, receiver_business_id) AND b.owner_id = auth.uid())
  OR EXISTS (SELECT 1 FROM public.businesses b JOIN public.profiles p ON p.business_id = b.id WHERE b.id IN (supplier_business_id, receiver_business_id) AND p.user_id = auth.uid())
);
-- Suppliers can request connections
CREATE POLICY "Suppliers can create connections" ON public.connections FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = supplier_business_id AND b.owner_id = auth.uid() AND b.business_type = 'supplier')
);
-- Receivers can update connection status (approve/reject)
CREATE POLICY "Receivers can update connections" ON public.connections FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.businesses b WHERE b.id = receiver_business_id AND b.owner_id = auth.uid() AND b.business_type = 'receiver')
);

-- Add receiver_business_id to dispatches
ALTER TABLE public.dispatches ADD COLUMN receiver_business_id UUID REFERENCES public.businesses(id);
ALTER TABLE public.dispatches ADD COLUMN supplier_business_id UUID REFERENCES public.businesses(id);

-- Update timestamp trigger for businesses
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
