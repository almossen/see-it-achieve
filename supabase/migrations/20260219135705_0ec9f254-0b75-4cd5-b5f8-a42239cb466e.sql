
-- Create storage bucket for substitute images
INSERT INTO storage.buckets (id, name, public) VALUES ('substitute-images', 'substitute-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view substitute images
CREATE POLICY "Public can view substitute images"
ON storage.objects FOR SELECT
USING (bucket_id = 'substitute-images');

-- Authenticated users can upload substitute images
CREATE POLICY "Authenticated users can upload substitute images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'substitute-images' AND auth.role() = 'authenticated');

-- Add substitute_name column to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS substitute_name text;
