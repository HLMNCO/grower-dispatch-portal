-- Update check constraint to include transporter
ALTER TABLE public.businesses DROP CONSTRAINT businesses_business_type_check;
ALTER TABLE public.businesses ADD CONSTRAINT businesses_business_type_check 
  CHECK (business_type = ANY (ARRAY['receiver'::text, 'supplier'::text, 'transporter'::text]));