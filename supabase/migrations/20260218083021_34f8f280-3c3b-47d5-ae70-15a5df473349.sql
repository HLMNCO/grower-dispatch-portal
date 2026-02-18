
-- Staff access requests table
CREATE TABLE public.staff_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

-- The requesting user can view their own request
CREATE POLICY "Users can view own request"
  ON public.staff_requests FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create a request
CREATE POLICY "Authenticated can create request"
  ON public.staff_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Staff (admins) can view all requests
CREATE POLICY "Staff can view all requests"
  ON public.staff_requests FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role));

-- Staff can update requests (approve/reject)
CREATE POLICY "Staff can update requests"
  ON public.staff_requests FOR UPDATE
  USING (has_role(auth.uid(), 'staff'::app_role));
