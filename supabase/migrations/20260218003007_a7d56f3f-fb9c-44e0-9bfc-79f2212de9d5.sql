
-- Add public intake token for receiver businesses
ALTER TABLE public.businesses 
ADD COLUMN public_intake_token uuid DEFAULT gen_random_uuid();

-- Create unique index on the token
CREATE UNIQUE INDEX idx_businesses_public_intake_token 
ON public.businesses(public_intake_token) 
WHERE public_intake_token IS NOT NULL;

-- Allow anonymous users to read basic business info by token (for the public form)
CREATE POLICY "Public can read business by intake token"
ON public.businesses
FOR SELECT
TO anon
USING (public_intake_token IS NOT NULL);
