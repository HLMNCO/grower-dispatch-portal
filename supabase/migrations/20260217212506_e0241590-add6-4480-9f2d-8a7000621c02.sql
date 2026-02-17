
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('staff', 'supplier');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  company_name TEXT NOT NULL DEFAULT '',
  grower_code TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Staff can view all profiles
CREATE POLICY "Staff can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'staff'));

-- Dispatches table
CREATE TABLE public.dispatches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_id TEXT NOT NULL UNIQUE DEFAULT ('DSP-' || LPAD(FLOOR(RANDOM() * 99999)::TEXT, 5, '0')),
  supplier_id UUID NOT NULL REFERENCES auth.users(id),
  grower_name TEXT NOT NULL,
  grower_code TEXT,
  dispatch_date DATE NOT NULL,
  expected_arrival DATE,
  con_note_number TEXT NOT NULL,
  carrier TEXT,
  total_pallets INT NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in-transit','arrived','received','issue')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;

-- Suppliers see their own dispatches, staff see all
CREATE POLICY "Suppliers can view own dispatches" ON public.dispatches FOR SELECT USING (auth.uid() = supplier_id);
CREATE POLICY "Staff can view all dispatches" ON public.dispatches FOR SELECT USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Suppliers can create dispatches" ON public.dispatches FOR INSERT WITH CHECK (auth.uid() = supplier_id);
CREATE POLICY "Staff can update dispatches" ON public.dispatches FOR UPDATE USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "Suppliers can update own dispatches" ON public.dispatches FOR UPDATE USING (auth.uid() = supplier_id AND status = 'pending');

-- Dispatch items
CREATE TABLE public.dispatch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  product TEXT NOT NULL,
  variety TEXT DEFAULT '',
  size TEXT DEFAULT '',
  tray_type TEXT DEFAULT '',
  quantity INT NOT NULL DEFAULT 0,
  weight NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatch_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Items visible with dispatch" ON public.dispatch_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.dispatches d WHERE d.id = dispatch_id AND (d.supplier_id = auth.uid() OR public.has_role(auth.uid(), 'staff')))
);
CREATE POLICY "Suppliers can add items" ON public.dispatch_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.dispatches d WHERE d.id = dispatch_id AND d.supplier_id = auth.uid())
);

-- Receiving issues
CREATE TABLE public.receiving_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id UUID NOT NULL REFERENCES public.dispatches(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL CHECK (issue_type IN ('damage','missing-paperwork','quantity-short','quality','temperature','other')),
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low','medium','high')),
  flagged_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.receiving_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Issues visible with dispatch" ON public.receiving_issues FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.dispatches d WHERE d.id = dispatch_id AND (d.supplier_id = auth.uid() OR public.has_role(auth.uid(), 'staff')))
);
CREATE POLICY "Staff can create issues" ON public.receiving_issues FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Auto-assign role on signup based on metadata
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'supplier'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_dispatches_updated_at BEFORE UPDATE ON public.dispatches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
