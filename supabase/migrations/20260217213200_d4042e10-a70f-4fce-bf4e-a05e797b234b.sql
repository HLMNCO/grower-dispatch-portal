
-- Create storage bucket for dispatch photos
INSERT INTO storage.buckets (id, name, public) VALUES ('dispatch-photos', 'dispatch-photos', true);

-- Anyone authenticated can upload to their own folder
CREATE POLICY "Users can upload dispatch photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'dispatch-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public read access for all dispatch photos
CREATE POLICY "Dispatch photos are publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'dispatch-photos');

-- Users can delete their own photos
CREATE POLICY "Users can delete own dispatch photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'dispatch-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add photos column to dispatches for supplier-side photos
ALTER TABLE public.dispatches ADD COLUMN photos TEXT[] DEFAULT '{}';

-- Add photo_url to receiving_issues for evidence photos
ALTER TABLE public.receiving_issues ADD COLUMN photo_url TEXT;
